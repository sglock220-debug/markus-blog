from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from .models import Article, Category
from .forms import RegisterForm

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
