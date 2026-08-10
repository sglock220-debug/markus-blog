import random
from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
import hashlib

class InvitationCode(models.Model):
    code = models.CharField(max_length=10, unique=True, verbose_name="内推码")
    is_active = models.BooleanField(default=True)
    used_count = models.IntegerField(default=0)
    max_uses = models.IntegerField(default=1)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "内推码"
        verbose_name_plural = "内推码"

    def __str__(self):
        return self.code

class EmailVerificationCode(models.Model):
    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = "邮箱验证码"
        verbose_name_plural = "邮箱验证码"

    def __str__(self):
        return f"{self.email} - {self.created_at}"

def generate_ai_uid(user):
    """Generate a unique 8-digit code for a user's AI characters and snapshots"""
    while True:
        code = ''.join(random.choices('0123456789', k=8))
        exists_character = AICharacter.objects.filter(user=user, ai_uid=code).exists()
        exists_snapshot = AIConversationSnapshot.objects.filter(user=user, ai_uid=code).exists()
        if not exists_character and not exists_snapshot:
            return code

def generate_public_id():
    """Generate a unique public ID in format A + 8 digits"""
    while True:
        code = 'A' + ''.join(random.choices('0123456789', k=8))
        if not UserProfile.objects.filter(public_id=code).exists():
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
    VISIBILITY_CHOICES = [
        ('private', '仅本人'),
        ('friends', '好友可见'),
        ('public', '公开'),
    ]
    title = models.CharField(max_length=200, verbose_name="标题")
    slug = models.SlugField(max_length=200, unique=True, verbose_name="Slug")
    content = models.TextField(verbose_name="正文内容")
    author = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="作者")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='articles', verbose_name="分类")
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='private', verbose_name="可见性")
    is_published = models.BooleanField(default=True, verbose_name="是否发布")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="发布时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

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
    public_id = models.CharField(max_length=9, unique=True, editable=False, db_index=True, verbose_name="公开ID")
    display_name = models.CharField(max_length=100, blank=True, verbose_name="显示名称")
    avatar = models.ImageField(upload_to="avatars/users/", null=True, blank=True, verbose_name="头像")
    avatar_original = models.ImageField(upload_to="avatars/users/original/", null=True, blank=True, verbose_name="头像原图")
    cover_image = models.ImageField(upload_to="covers/users/", null=True, blank=True, verbose_name="封面图")
    cover_image_original = models.ImageField(upload_to="covers/users/original/", null=True, blank=True, verbose_name="封面图原图")
    bio = models.TextField(max_length=500, blank=True, verbose_name="个人简介")
    location = models.CharField(max_length=100, blank=True, verbose_name="所在地")
    show_location = models.BooleanField(default=False, verbose_name="显示所在地")
    show_dating_profile = models.BooleanField(default=False, verbose_name="显示交友资料")
    show_notes_public = models.BooleanField(default=True, verbose_name="公开笔记")
    show_bookmarks_public = models.BooleanField(default=False, verbose_name="公开收藏")
    show_following_public = models.BooleanField(default=True, verbose_name="公开关注列表")
    show_followers_public = models.BooleanField(default=True, verbose_name="公开粉丝列表")
    is_public = models.BooleanField(default=True, verbose_name="公开主页")
    current_wallpaper = models.CharField(max_length=255, blank=True, verbose_name="当前使用的壁纸")
    current_background_type = models.CharField(max_length=20, default="image", verbose_name="当前背景类型")
    current_background_color = models.CharField(max_length=20, default="#f5f5f5", verbose_name="当前纯色背景")
    current_wallpaper_mode = models.CharField(max_length=20, default="pc", verbose_name="当前壁纸模式")
    current_wallpaper_kind = models.CharField(max_length=20, default="default", verbose_name="当前壁纸来源")
    current_wallpaper_object = models.ForeignKey(
        'UserWallpaper',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_for_profiles',
        verbose_name="当前自定义壁纸"
    )
    wallpaper_shortcuts = models.JSONField(default=list, blank=True, verbose_name="快捷壁纸槽")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.public_id:
            # Special case for Markus handled in migration, but here for new users
            self.public_id = generate_public_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username}'s profile ({self.public_id})"

class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following', verbose_name="关注者")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers', verbose_name="被关注者")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        indexes = [
            models.Index(fields=['follower', 'following']),
        ]
        verbose_name = "关注关系"
        verbose_name_plural = "关注关系"

    def clean(self):
        if self.follower == self.following:
            from django.core.exceptions import ValidationError
            raise ValidationError("不能关注自己")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.follower.username} -> {self.following.username}"

class UserWallpaper(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallpapers')
    name = models.CharField(max_length=15, blank=True, default="", verbose_name="壁纸名称")
    original_image = models.ImageField(upload_to="wallpapers/users/original/", null=True, blank=True, verbose_name="壁纸原图")
    pc_image = models.ImageField(upload_to="wallpapers/users/pc/", null=True, blank=True, verbose_name="PC壁纸")
    mobile_image = models.ImageField(upload_to="wallpapers/users/mobile/", null=True, blank=True, verbose_name="手机壁纸")
    image = models.ImageField(upload_to="wallpapers/users/", verbose_name="壁纸图片")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "用户壁纸"
        verbose_name_plural = "用户壁纸"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s wallpaper {self.id}"

class NotebookState(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notebook_state",
    )
    data = models.JSONField(default=dict, blank=True)
    schema_version = models.PositiveIntegerField(default=2)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} notebook"

class DesktopState(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="desktop_state",
    )
    data = models.JSONField(default=dict, blank=True)
    schema_version = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} desktop"

class Resume(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resume",
    )
    age = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=60, blank=True)
    email = models.EmailField(blank=True)
    photo = models.ImageField(upload_to="resumes/photos/", null=True, blank=True)
    is_public = models.BooleanField(default=True)
    schema_version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Resume"
        verbose_name_plural = "Resumes"

    def __str__(self):
        return f"{self.user.username} resume"

class ResumeTranslation(models.Model):
    LANGUAGE_CHOICES = [
        ('zh', 'Chinese'),
        ('de', 'German'),
        ('en', 'English'),
    ]

    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="translations")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES)
    full_name = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    educations = models.JSONField(default=list, blank=True)
    skill_sections = models.JSONField(default=list, blank=True)
    projects = models.JSONField(default=list, blank=True)
    languages = models.JSONField(default=list, blank=True)
    competitions = models.JSONField(default=list, blank=True)
    extras = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['resume', 'language'], name='unique_resume_translation_language')
        ]
        ordering = ['language']

    def __str__(self):
        return f"{self.resume.user.username} resume {self.language}"

class ResumePDF(models.Model):
    LANGUAGE_CHOICES = ResumeTranslation.LANGUAGE_CHOICES

    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="pdfs")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES)
    file = models.FileField(upload_to="resumes/pdfs/")
    uploaded_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['resume', 'language'], name='unique_resume_pdf_language')
        ]
        ordering = ['language']

    def __str__(self):
        return f"{self.resume.user.username} resume PDF {self.language}"

@receiver(post_delete, sender=ResumePDF)
def delete_resume_pdf_file(sender, instance, **kwargs):
    if instance.file:
        instance.file.delete(save=False)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)
        Resume.objects.get_or_create(user=instance, defaults={"email": instance.email})

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class AICharacter(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_characters')
    ai_uid = models.CharField(max_length=8, db_index=True, blank=True, verbose_name="角色码")
    name = models.CharField(max_length=100, verbose_name="角色昵称")
    real_name = models.CharField(max_length=100, blank=True, default="", verbose_name="角色姓名")
    aliases = models.JSONField(default=list, blank=True, verbose_name="角色小名")
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
    character = models.ForeignKey(AICharacter, on_delete=models.CASCADE, null=True, blank=True, related_name='conversations')
    participants = models.ManyToManyField(AICharacter, blank=True, related_name='group_conversations', verbose_name="群聊成员")
    is_group = models.BooleanField(default=False, verbose_name="是否群聊")
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
    sender_character = models.ForeignKey(AICharacter, null=True, blank=True, on_delete=models.SET_NULL, related_name='sent_messages')
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
