from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.middleware.csrf import get_token
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Article, Category
from .forms import RegisterForm
from .serializers import ArticleSerializer, CategorySerializer, UserSerializer

import json
import base64
import uuid
from PIL import Image
from io import BytesIO
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import asyncio

# Global dictionary to store results for pending tasks
task_results = {}

@csrf_exempt
@require_POST
async def yolo_detect(request):
    image_file = request.FILES.get("image")
    if image_file is None:
        return JsonResponse({"error": "No image uploaded"}, status=400)

    # Get classes from request, default to [0] (person)
    classes_raw = request.POST.get("classes", "[0]")
    try:
        classes = json.loads(classes_raw)
    except Exception:
        classes = [0]

    channel_layer = get_channel_layer()
    
    # Check if we have workers
    from .consumers import active_workers
    if not active_workers:
        return JsonResponse({
            "error": "YOLO worker offline",
            "detections": [],
            "width": 0,
            "height": 0
        }, status=503)

    try:
        # 1. Read image and convert to base64
        # We need to run sync IO in a thread if we want to be truly async-friendly
        # but for small images it's fine.
        pil_img = Image.open(image_file).convert("RGB")
        buffered = BytesIO()
        pil_img.save(buffered, format="JPEG", quality=50)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        w, h = pil_img.size

        task_id = str(uuid.uuid4())
        
        # 2. Prepare task
        task_data = {
            "type": "detect",
            "task_id": task_id,
            "image": img_str,
            "classes": classes,
            "conf": 0.5
        }

        # 3. Create a future to wait for the result
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        task_results[task_id] = future

        # 4. Send task to all workers (or just one)
        await channel_layer.group_send(
            "yolo_workers",
            {
                "type": "send_task",
                "data": task_data
            }
        )

        # 5. Wait for result with timeout
        try:
            result_data = await asyncio.wait_for(future, timeout=5.0)
            return JsonResponse({
                "detections": result_data.get("detections", []),
                "width": result_data.get("width", w),
                "height": result_data.get("height", h),
                "worker": "local-laptop"
            })
        except asyncio.TimeoutError:
            return JsonResponse({"error": "Worker timeout"}, status=504)
        finally:
            if task_id in task_results:
                del task_results[task_id]

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# --- Template Views ---
# ... (existing template views)

# --- API Views ---

class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Article.objects.filter(is_published=True)
    serializer_class = ArticleSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        category_slug = self.request.query_params.get('category')
        query = self.request.query_params.get('q')
        
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) | Q(content__icontains=query)
            )
        return queryset

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_csrf_token(request):
    return Response({'csrfToken': get_token(request)})

@api_view(['GET'])
def get_user_info(request):
    if request.user.is_authenticated:
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    return Response({'detail': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({"success": True, "username": user.username})
    return Response({"success": False, "error": "用户名或密码错误"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_register(request):
    form = RegisterForm(data=request.data)
    if form.is_valid():
        user = form.save()
        login(request, user)
        return Response(UserSerializer(user).data)
    return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def api_logout(request):
    logout(request)
    return Response({'detail': 'Logged out'})


@login_required
def index(request):
    articles = Article.objects.filter(is_published=True)
    categories = Category.objects.all()
    current_category = None
    return render(request, 'blog/index.html', {
        'articles': articles,
        'categories': categories,
        'current_category': current_category
    })

@login_required
def category_posts(request, slug):
    category = get_object_or_404(Category, slug=slug)
    articles = Article.objects.filter(category=category, is_published=True)
    categories = Category.objects.all()
    return render(request, 'blog/index.html', {
        'articles': articles,
        'categories': categories,
        'current_category': category
    })

@login_required
def post_detail(request, slug):
    article = get_object_or_404(Article, slug=slug, is_published=True)
    return render(request, 'blog/detail.html', {'article': article})

@login_required
def search(request):
    query = request.GET.get('q', '')
    if query:
        articles = Article.objects.filter(
            Q(title__icontains=query) | Q(content__icontains=query),
            is_published=True
        )
    else:
        articles = Article.objects.none()
    
    return render(request, 'blog/search.html', {
        'articles': articles,
        'query': query
    })

def login_register_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    
    login_form = AuthenticationForm()
    register_form = RegisterForm()
    active_tab = 'login'

    if request.method == 'POST':
        if 'login_submit' in request.POST:
            active_tab = 'login'
            login_form = AuthenticationForm(data=request.POST)
            if login_form.is_valid():
                user = login_form.get_user()
                login(request, user)
                return redirect('index')
        elif 'register_submit' in request.POST:
            active_tab = 'register'
            register_form = RegisterForm(data=request.POST)
            if register_form.is_valid():
                user = register_form.save()
                login(request, user)
                return redirect('index')

    return render(request, 'blog/login.html', {
        'login_form': login_form,
        'register_form': register_form,
        'active_tab': active_tab
    })

def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def profile_view(request):
    user_articles = Article.objects.filter(author=request.user)
    return render(request, 'blog/profile.html', {
        'user': request.user,
        'articles': user_articles,
        'article_count': user_articles.count()
    })

def handler404(request, exception):
    return render(request, 'blog/404.html', status=404)

def vue_app(request):
    return render(request, 'index.html')

