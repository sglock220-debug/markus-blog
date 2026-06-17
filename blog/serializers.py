from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Article, Category, UserProfile, AICharacter, AIProviderConfig, AIConversation, AIMessage

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
    class Meta:
        model = AICharacter
        fields = [
            'id', 'name', 'avatar', 'system_prompt', 'model_name', 
            'temperature', 'remark', 'enabled', 'created_at', 'updated_at'
        ]

class AIProviderConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIProviderConfig
        fields = [
            'id', 'provider_name', 'base_url', 'api_key', 
            'default_model', 'enabled', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'api_key': {'write_only': True}
        }

class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = ['id', 'conversation', 'role', 'content', 'created_at']

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
