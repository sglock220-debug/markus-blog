from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('post/<str:slug>/', views.post_detail, name='post_detail'),
    path('category/<str:slug>/', views.category_posts, name='category_posts'),
    path('search/', views.search, name='search'),
    path('login/', views.login_register_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
]
