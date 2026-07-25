from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Article, Category, UserProfile, Follow, AICharacter, AIProviderConfig, AIConversation, AIMessage, AIConversationSnapshot, UserWallpaper

class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='profile.display_name', read_only=True)
    current_wallpaper = serializers.CharField(source='profile.current_wallpaper', read_only=True)
    current_background_type = serializers.CharField(source='profile.current_background_type', read_only=True)
    current_background_color = serializers.CharField(source='profile.current_background_color', read_only=True)
    current_wallpaper_mode = serializers.CharField(source='profile.current_wallpaper_mode', read_only=True)
    current_wallpaper_kind = serializers.CharField(source='profile.current_wallpaper_kind', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'display_name', 'date_joined',
            'current_wallpaper', 'current_background_type', 'current_background_color',
            'current_wallpaper_mode', 'current_wallpaper_kind'
        ]

class UserWallpaperSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserWallpaper
        fields = [
            'id', 'name', 'image', 'original_image', 'pc_image', 'mobile_image',
            'created_at', 'updated_at'
        ]

class MyProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    following_count = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    bookmarks_count = serializers.IntegerField(default=0, read_only=True)
    likes_received = serializers.IntegerField(default=0, read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'public_id', 'username', 'email', 'display_name', 'avatar', 'avatar_original',
            'cover_image', 'cover_image_original', 'bio', 'location', 'show_location', 
            'show_dating_profile', 'show_notes_public', 'show_bookmarks_public',
            'show_following_public', 'show_followers_public', 'is_public',
            'current_wallpaper', 'current_background_type', 'current_background_color',
            'current_wallpaper_mode', 'current_wallpaper_kind', 'current_wallpaper_object',
            'wallpaper_shortcuts',
            'following_count', 'followers_count', 'bookmarks_count', 'likes_received',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'public_id', 'created_at', 'updated_at']

    def get_following_count(self, obj):
        return obj.user.following.count()

    def get_followers_count(self, obj):
        return obj.user.followers.count()

class PublicProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    following_count = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    likes_received = serializers.IntegerField(default=0, read_only=True)
    relation_status = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'public_id', 'username', 'display_name', 'avatar', 'avatar_original',
            'cover_image', 'cover_image_original', 'bio', 'location', 'show_location', 
            'show_dating_profile', 'show_notes_public', 'show_bookmarks_public',
            'show_following_public', 'show_followers_public',
            'following_count', 'followers_count', 'likes_received',
            'relation_status', 'created_at'
        ]

    def get_following_count(self, obj):
        return obj.user.following.count()

    def get_followers_count(self, obj):
        return obj.user.followers.count()

    def get_relation_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user == obj.user:
            return None
        
        # Check relation
        from .models import Follow
        i_follow_them = Follow.objects.filter(follower=request.user, following=obj.user).exists()
        they_follow_me = Follow.objects.filter(follower=obj.user, following=request.user).exists()
        
        if i_follow_them and they_follow_me:
            return 'mutual'
        if i_follow_them:
            return 'following'
        if they_follow_me:
            return 'follower'
        return 'none'

class AICharacterSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()

    class Meta:
        model = AICharacter
        fields = [
            'id', 'ai_uid', 'name', 'avatar', 'system_prompt', 'model_name', 
            'temperature', 'remark', 'enabled', 'last_message', 'last_message_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['ai_uid']

    def _get_latest_message(self, obj):
        if not hasattr(self, '_latest_msg_cache'):
            self._latest_msg_cache = {}
        
        if obj.id not in self._latest_msg_cache:
            latest_conv = obj.conversations.order_by('-updated_at').first()
            if latest_conv:
                latest_msg = latest_conv.messages.order_by('-created_at').first()
                self._latest_msg_cache[obj.id] = latest_msg
            else:
                self._latest_msg_cache[obj.id] = None
        
        return self._latest_msg_cache[obj.id]

    def get_last_message(self, obj):
        last_msg = self._get_latest_message(obj)
        return last_msg.content if last_msg else "暂无消息"

    def get_last_message_at(self, obj):
        last_msg = self._get_latest_message(obj)
        return last_msg.created_at if last_msg else None

class AIProviderConfigSerializer(serializers.ModelSerializer):
    has_api_key = serializers.SerializerMethodField()

    class Meta:
        model = AIProviderConfig
        fields = [
            'id', 'provider_name', 'base_url', 'api_key', 
            'default_model', 'temperature', 'enabled', 'has_api_key', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'api_key': {'write_only': True, 'required': False, 'allow_blank': True}
        }

    def get_has_api_key(self, obj):
        return bool(obj.api_key)

class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = ['id', 'conversation', 'role', 'content', 'quote', 'created_at']

class AIConversationSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConversationSnapshot
        fields = [
            'id', 'ai_uid', 'character', 'character_name', 'character_avatar_url', 
            'character_model_name', 'conversation', 'slot_index', 
            'custom_name', 'name', 'messages_json', 'message_count', 
            'saved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'ai_uid', 'saved_at', 'created_at', 'updated_at']

    def validate_custom_name(self, value):
        if value and len(value) > 15:
            raise serializers.ValidationError("存档名称最多 15 个字")
        return value

class AIConversationSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    character_avatar = serializers.ImageField(source='character.avatar', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = AIConversation
        fields = [
            'id', 'character', 'character_name', 'character_avatar', 
            'title', 'last_message', 'created_at', 'updated_at'
        ]

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return last_msg.content
        return ""

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_public_id = serializers.CharField(source='author.profile.public_id', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'content', 'author_name', 'author_public_id',
            'category', 'category_name', 'visibility', 'is_published',
            'created_at', 'updated_at'
        ]
