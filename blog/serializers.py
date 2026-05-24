from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Article, Category

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']

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
