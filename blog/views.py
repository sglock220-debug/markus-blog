from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from .models import Article, Category

def index(request):
    articles = Article.objects.filter(is_published=True)
    categories = Category.objects.all()
    current_category = None
    return render(request, 'blog/index.html', {
        'articles': articles,
        'categories': categories,
        'current_category': current_category
    })

def category_posts(request, slug):
    category = get_object_or_404(Category, slug=slug)
    articles = Article.objects.filter(category=category, is_published=True)
    categories = Category.objects.all()
    return render(request, 'blog/index.html', {
        'articles': articles,
        'categories': categories,
        'current_category': category
    })

def post_detail(request, slug):
    article = get_object_or_404(Article, slug=slug, is_published=True)
    return render(request, 'blog/detail.html', {'article': article})

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

def handler404(request, exception):
    return render(request, 'blog/404.html', status=404)
