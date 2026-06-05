from django.urls import path
from .views import VocabularyProgressView, VocabularySyncView

urlpatterns = [
    path('progress/', VocabularyProgressView.as_view(), name='vocabulary_progress'),
    path('progress/sync/', VocabularySyncView.as_view(), name='vocabulary_sync'),
]
