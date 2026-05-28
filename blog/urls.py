from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'articles', views.ArticleViewSet, basename='article')

urlpatterns = [
    # API URLs
    path('api/', include(router.urls)),
    path('api/categories/', views.CategoryListView.as_view(), name='api_categories'),
    path('api/csrf/', views.get_csrf_token, name='api_csrf'),
    path('api/user/', views.get_user_info, name='api_user'),
    path('api/login/', views.api_login, name='api_login'),
    path('api/register/', views.api_register, name='api_register'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/yolo-detect/', views.yolo_detect, name='yolo_detect'),

    # Template URLs (Fallback/Old)
    path('old/', views.index, name='index_old'),
    path('old/post/<str:slug>/', views.post_detail, name='post_detail_old'),
    path('old/category/<str:slug>/', views.category_posts, name='category_posts_old'),
    path('old/search/', views.search, name='search_old'),
    path('old/login/', views.login_register_view, name='login_old'),
    path('old/logout/', views.logout_view, name='logout_old'),
    path('old/profile/', views.profile_view, name='profile_old'),

    # SPA (Vue App) - Catch-all
    re_path(r'^.*$', views.vue_app, name='vue_app'),
]


