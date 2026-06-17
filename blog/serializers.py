from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Article, Category, UserProfile, AICharacter, AIProviderConfig, AIConversation, AIMessage, AIConversationSnapshot

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'display_name', 'avatar', 'bio', 'created_at', 'updated_at']

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
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'content', 'author', 
            'category', 'created_at', 'updated_at', 'is_published'
        ]
