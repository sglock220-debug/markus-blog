import random
from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

def generate_ai_uid(user):
    """Generate a unique 8-digit code for a user's AI characters and snapshots"""
    while True:
        code = ''.join(random.choices('0123456789', k=8))
        exists_character = AICharacter.objects.filter(user=user, ai_uid=code).exists()
        exists_snapshot = AIConversationSnapshot.objects.filter(user=user, ai_uid=code).exists()
        if not exists_character and not exists_snapshot:
            return code

class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="分类名称")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug")

    class Meta:
        verbose_name = "分类"
        verbose_name_plural = "分类"

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('category_posts', kwargs={'slug': self.slug})

class Article(models.Model):
    title = models.CharField(max_length=200, verbose_name="标题")
    slug = models.SlugField(max_length=200, unique=True, verbose_name="Slug")
    content = models.TextField(verbose_name="正文内容")
    author = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="作者")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='articles', verbose_name="分类")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="发布时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    is_published = models.BooleanField(default=True, verbose_name="是否发布")

    class Meta:
        verbose_name = "文章"
        verbose_name_plural = "文章"
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('post_detail', kwargs={'slug': self.slug})

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=100, blank=True, verbose_name="显示名称")
    avatar = models.ImageField(upload_to="avatars/users/", null=True, blank=True, verbose_name="头像")
    bio = models.TextField(max_length=500, blank=True, verbose_name="个人简介")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

class AICharacter(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_characters')
    ai_uid = models.CharField(max_length=8, db_index=True, blank=True, verbose_name="角色码")
    name = models.CharField(max_length=100, verbose_name="角色名")
    avatar = models.ImageField(upload_to="avatars/ai/", null=True, blank=True, verbose_name="角色头像")
    system_prompt = models.TextField(verbose_name="系统提示词")
    model_name = models.CharField(max_length=100, default="deepseek-chat", verbose_name="模型名")
    temperature = models.FloatField(default=0.7, verbose_name="Temperature")
    remark = models.CharField(max_length=200, blank=True, verbose_name="备注")
    enabled = models.BooleanField(default=True, verbose_name="是否启用")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'ai_uid')

    def save(self, *args, **kwargs):
        if not self.ai_uid:
            self.ai_uid = generate_ai_uid(self.user)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.ai_uid})"

class AIProviderConfig(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_configs')
    provider_name = models.CharField(max_length=50, default="deepseek", verbose_name="提供商")
    base_url = models.URLField(default="https://api.deepseek.com", verbose_name="API Base URL")
    api_key = models.CharField(max_length=200, verbose_name="API Key")
    default_model = models.CharField(max_length=100, default="deepseek-chat", verbose_name="默认模型")
    temperature = models.FloatField(default=0.7, verbose_name="默认 Temperature")
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.provider_name} config for {self.user.username}"

class AIConversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_conversations')
    character = models.ForeignKey(AICharacter, on_delete=models.CASCADE, related_name='conversations')
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Chat with {self.character.name}"

class AIMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    quote = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:20]}..."

class AIConversationSnapshot(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_snapshots')
    ai_uid = models.CharField(max_length=8, db_index=True, blank=True, default="", verbose_name="角色码")
    character = models.ForeignKey(AICharacter, null=True, blank=True, on_delete=models.SET_NULL, related_name='snapshots')
    
    # Snapshot Character Info (to preserve info even if character is deleted)
    character_name = models.CharField(max_length=100, blank=True, default="", verbose_name="人物快照名称")
    character_avatar_url = models.TextField(blank=True, default="", verbose_name="人物快照头像URL")
    character_model_name = models.CharField(max_length=100, blank=True, default="", verbose_name="人物快照模型名称")

    conversation = models.ForeignKey(AIConversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='snapshots')
    slot_index = models.PositiveSmallIntegerField(default=1, verbose_name="存档槽位")
    custom_name = models.CharField(max_length=100, blank=True, default="", verbose_name="自定义名称")
    name = models.CharField(max_length=100, blank=True, default="", verbose_name="版本名称") 
    messages_json = models.JSONField(verbose_name="消息数据")
    message_count = models.IntegerField(default=0, verbose_name="消息数量")
    
    saved_at = models.DateTimeField(null=True, blank=True, verbose_name="保存时间")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "聊天快照"
        verbose_name_plural = "聊天快照"
        ordering = ['slot_index']
        unique_together = ('user', 'ai_uid', 'slot_index')

    def __str__(self):
        return f"{self.character_name or '未知'} ({self.ai_uid}) - Slot {self.slot_index}"
