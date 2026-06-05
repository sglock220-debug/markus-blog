from django.db import models
from django.conf import settings

class VocabularyProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vocabulary_progress'
    )

    language = models.CharField(max_length=30)
    level = models.CharField(max_length=20)
    word_id = models.IntegerField()
    learned = models.BooleanField(default=False)

    client_updated_at = models.DateTimeField()
    server_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'language', 'level', 'word_id'],
                name='unique_user_language_level_word'
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.language} {self.level} - Word {self.word_id}: {'Learned' if self.learned else 'Not Learned'}"
