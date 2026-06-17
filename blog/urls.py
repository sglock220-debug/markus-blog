from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'articles', views.ArticleViewSet, basename='article')
router.register(r'ai/characters', views.AICharacterViewSet, basename='ai_characters')
router.register(r'ai/conversations', views.AIConversationViewSet, basename='ai_conversations')
router.register(r'ai/snapshots', views.AIConversationSnapshotViewSet, basename='ai_snapshots')

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
    
    # User Profile API
    path('api/user/profile/', views.user_profile_view, name='api_user_profile'),
    path('api/user/avatar/', views.upload_user_avatar, name='api_user_avatar'),

    # AI Assistant API
    path('api/ai/messages/<int:conversation_id>/', views.get_conversation_messages, name='api_ai_messages'),
    path('api/ai/settings/', views.ai_settings_view, name='api_ai_settings'),
    path('api/ai/test-connection/', views.test_ai_connection, name='api_ai_test_connection'),
    path('api/ai/chat/', views.ai_chat_view, name='api_ai_chat'),

    path('api/music/tracks/', views.get_music_tracks, name='api_music_tracks'),
    path('api/music/upload/', views.upload_music_tracks, name='api_music_upload'),
    path('api/music/open-folder/', views.open_music_folder, name='api_music_open_folder'),
    path('api/music/tracks/<path:filename>/', views.delete_music_track, name='api_delete_music_track'),
    path('api/music/tracks/<path:filename>/rename/', views.rename_music_track, name='api_rename_music_track'),

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


