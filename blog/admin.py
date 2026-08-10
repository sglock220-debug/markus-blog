from django.contrib import admin
from .models import Category, Article, Resume, ResumeTranslation, ResumePDF

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'created_at', 'is_published')
    list_filter = ('is_published', 'category', 'author')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'created_at'

@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ('user', 'age', 'is_public', 'updated_at')
    list_filter = ('is_public',)
    search_fields = ('user__username',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ResumeTranslation)
class ResumeTranslationAdmin(admin.ModelAdmin):
    list_display = ('resume', 'language', 'full_name', 'city', 'email', 'phone', 'updated_at')
    list_filter = ('language',)
    search_fields = ('resume__user__username', 'full_name', 'city', 'email', 'phone')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ResumePDF)
class ResumePDFAdmin(admin.ModelAdmin):
    list_display = ('resume', 'language', 'file', 'uploaded_at')
    list_filter = ('language',)
    search_fields = ('resume__user__username',)
    readonly_fields = ('uploaded_at',)
