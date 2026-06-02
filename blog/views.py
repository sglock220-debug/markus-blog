from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.middleware.csrf import get_token
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Article, Category
from .forms import RegisterForm
from .serializers import ArticleSerializer, CategorySerializer, UserSerializer

import os
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

from pathlib import Path
from urllib.parse import unquote

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def upload_music_tracks(request):
    """
    Upload music files and save them to media/music folder.
    """
    from pathlib import Path
    
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac')
    
    files = request.FILES.getlist('files')
    if not files:
        return Response({"error": "No files uploaded"}, status=400)
        
    music_dir = Path(settings.MEDIA_ROOT) / "music"
    music_dir.mkdir(parents=True, exist_ok=True)
    
    saved_tracks = []
    rejected = []
    
    for file in files:
        # Security: only use basename to prevent directory traversal
        original_name = os.path.basename(file.name)
        lower_name = original_name.lower()
        
        if not lower_name.endswith(allowed_extensions):
            rejected.append(original_name)
            continue
            
        target_path = music_dir / original_name
        
        # Handle duplicate filenames: auto increment suffix
        base = target_path.stem
        ext = target_path.suffix
        counter = 1
        while target_path.exists():
            target_path = music_dir / f"{base}_{counter}{ext}"
            counter += 1
            
        try:
            with open(target_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            filename = target_path.name
            track_url = os.path.join(settings.MEDIA_URL, 'music', filename).replace('\\', '/')
            
            saved_tracks.append({
                "id": filename,
                "name": filename,
                "url": track_url,
                "disabled": False
            })
        except Exception as e:
            rejected.append(f"{original_name} (error: {str(e)})")

    if rejected and not saved_tracks:
        return Response({
            "error": f"添加失败：{', '.join(rejected)} 文件不可播放或保存失败",
            "rejected": rejected
        }, status=400)
        
    return Response({
        "success": True,
        "count": len(saved_tracks),
        "tracks": saved_tracks,
        "rejected": rejected
    })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def open_music_folder(request):
    """
    Open the media/music folder in the system file manager (Local Dev Only).
    """
    import os
    import sys
    import subprocess
    from pathlib import Path

    music_dir = Path(settings.MEDIA_ROOT) / "music"
    music_dir.mkdir(parents=True, exist_ok=True)

    try:
        if sys.platform.startswith("win"):
            os.startfile(str(music_dir))
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(music_dir)])
        else:
            subprocess.Popen(["xdg-open", str(music_dir)])

        return Response({
            "success": True,
            "path": str(music_dir)
        })
    except Exception as e:
        return Response({
            "success": False,
            "path": str(music_dir),
            "error": str(e)
        }, status=500)

@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def delete_music_track(request, filename):
    """
    Delete a music file from media/music folder.
    """
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac')
    
    filename = unquote(filename)
    # Basic security: only filename, no path components
    safe_name = os.path.basename(filename)
    
    if safe_name != filename:
        return Response({"error": "Invalid filename"}, status=400)
        
    if not safe_name.lower().endswith(allowed_extensions):
        return Response({"error": "Unsupported file type"}, status=400)
        
    music_dir = Path(settings.MEDIA_ROOT) / "music"
    file_path = music_dir / safe_name
    
    try:
        # Final security check: ensure the resolved path is inside music_dir
        file_path = file_path.resolve()
        music_dir = music_dir.resolve()
        
        if not str(file_path).startswith(str(music_dir)):
             return Response({"error": "Invalid path"}, status=400)
             
        if not file_path.exists() or not file_path.is_file():
            return Response({"error": "File not found"}, status=404)
            
        file_path.unlink()
        return Response({"success": True})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['PATCH'])
@permission_classes([permissions.AllowAny])
def rename_music_track(request, filename):
    """
    Rename a music file in media/music folder.
    """
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac')
    
    filename = unquote(filename)
    old_safe_name = os.path.basename(filename)
    new_name_base = request.data.get('new_name', '').strip()
    
    if not new_name_base:
        return Response({"error": "New name cannot be empty"}, status=400)
        
    if '/' in new_name_base or '\\' in new_name_base or '..' in new_name_base:
        return Response({"error": "Invalid characters in new name"}, status=400)

    if old_safe_name != filename:
        return Response({"error": "Invalid filename"}, status=400)
        
    if not old_safe_name.lower().endswith(allowed_extensions):
        return Response({"error": "Unsupported file type"}, status=400)
        
    # Extract extension from old file
    ext = os.path.splitext(old_safe_name)[1]
    new_filename = new_name_base + ext
    
    music_dir = Path(settings.MEDIA_ROOT) / "music"
    old_path = (music_dir / old_safe_name).resolve()
    new_path = (music_dir / new_filename).resolve()
    music_dir = music_dir.resolve()
    
    # Security check
    if not str(old_path).startswith(str(music_dir)) or not str(new_path).startswith(str(music_dir)):
        return Response({"error": "Invalid path"}, status=400)
        
    if not old_path.exists():
        return Response({"error": "Source file not found"}, status=404)
        
    if new_path.exists() and old_path != new_path:
        return Response({"error": "Target file already exists"}, status=409)
        
    try:
        old_path.rename(new_path)
        track_url = os.path.join(settings.MEDIA_URL, 'music', new_filename).replace('\\', '/')
        return Response({
            "id": new_filename,
            "name": new_filename,
            "url": track_url,
            "disabled": False
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_music_tracks(request):
    """
    Scan media/music folder and return list of music tracks.
    """
    music_dir = os.path.join(settings.MEDIA_ROOT, 'music')
    
    # Create directory if not exists
    if not os.path.exists(music_dir):
        os.makedirs(music_dir, exist_ok=True)
    
    tracks = []
    # Supported formats: .mp3, .wav, .ogg, .flac, .m4a, .aac
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac')
    
    try:
        # Scan files in directory
        for filename in os.listdir(music_dir):
            # Security check: only allow files, no directory traversal
            if not os.path.isfile(os.path.join(music_dir, filename)):
                continue
                
            if filename.lower().endswith(allowed_extensions):
                # Use forward slashes for URLs
                track_url = os.path.join(settings.MEDIA_URL, 'music', filename).replace('\\', '/')
                tracks.append({
                    "id": filename,
                    "name": filename,
                    "url": track_url,
                    "disabled": False
                })
        
        # Sort tracks by name
        tracks.sort(key=lambda x: x['name'])
        
        return Response(tracks)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

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

