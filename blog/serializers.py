from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Article, Category, UserProfile, Follow, AICharacter, AIProviderConfig, AIConversation, AIMessage, AIConversationSnapshot, UserWallpaper, Resume, ResumeTranslation, ResumePDF

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

class ResumeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    language = serializers.CharField(read_only=True)
    can_edit = serializers.SerializerMethodField()
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    age = serializers.CharField(required=False, allow_blank=True, max_length=20)
    city = serializers.CharField(required=False, allow_blank=True, max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=60)
    email = serializers.EmailField(required=False, allow_blank=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    educations = serializers.ListField(required=False)
    skill_sections = serializers.ListField(required=False)
    projects = serializers.ListField(required=False)
    languages = serializers.ListField(required=False)
    competitions = serializers.ListField(required=False)
    extras = serializers.ListField(required=False)
    is_public = serializers.BooleanField(required=False)
    pdfs = serializers.DictField(read_only=True)
    schema_version = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_can_edit(self, obj):
        request = self.context.get('request')
        resume = self._resume_from_obj(obj)
        return bool(request and request.user.is_authenticated and request.user.id == resume.user_id)

    def _resume_from_obj(self, obj):
        return obj['resume'] if isinstance(obj, dict) else obj

    def _translation_from_obj(self, obj):
        return obj.get('translation') if isinstance(obj, dict) else None

    def to_representation(self, instance):
        resume = self._resume_from_obj(instance)
        translation = self._translation_from_obj(instance)
        request = self.context.get('request')
        language = self.context.get('language', 'zh')

        data = {
            'id': resume.id,
            'username': resume.user.username,
            'language': language,
            'full_name': translation.full_name if translation else '',
            'age': resume.age,
            'city': translation.city if translation else '',
            'phone': translation.phone if translation else '',
            'email': translation.email if translation else '',
            'photo': request.build_absolute_uri(resume.photo.url) if request and resume.photo else (resume.photo.url if resume.photo else None),
            'educations': translation.educations if translation else [],
            'skill_sections': translation.skill_sections if translation else [],
            'projects': translation.projects if translation else [],
            'languages': translation.languages if translation else [],
            'competitions': translation.competitions if translation else [],
            'extras': translation.extras if translation else [],
            'is_public': resume.is_public,
            'pdfs': self._pdf_status(resume),
            'schema_version': resume.schema_version,
            'can_edit': self.get_can_edit(instance),
            'created_at': resume.created_at,
            'updated_at': resume.updated_at,
        }
        return data

    def _pdf_status(self, resume):
        existing = {item.language: item for item in resume.pdfs.all()}
        status = {}
        for language in ['zh', 'de', 'en']:
            item = existing.get(language)
            status[language] = {
                'available': bool(item and item.file),
                'uploaded_at': item.uploaded_at if item else None,
            }
        return status

    def validate_photo(self, value):
        if value is None:
            return value
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Photo cannot exceed 5MB")
        if not value.name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            raise serializers.ValidationError("Only JPG, JPEG, PNG, and WEBP photos are supported")
        return value

    def _clean_item_list(self, value, allowed_keys, field_name):
        if value in [None, ""]:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} must be a list")

        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"{field_name} items must be objects")
            cleaned_item = {}
            for key in allowed_keys:
                if key == 'is_current':
                    cleaned_item[key] = bool(item.get(key, False))
                else:
                    cleaned_item[key] = str(item.get(key, "") or "").strip()
            cleaned.append(cleaned_item)
        return cleaned

    def validate_educations(self, value):
        return self._clean_item_list(
            value,
            ['start_date', 'end_date', 'is_current', 'school', 'major', 'degree'],
            'educations'
        )

    def validate_projects(self, value):
        return self._clean_item_list(
            value,
            ['start_date', 'end_date', 'name', 'description'],
            'projects'
        )

    def validate_skill_sections(self, value):
        cleaned = self._clean_item_list(
            value,
            ['id', 'title', 'description', 'order'],
            'skill_sections'
        )
        for index, item in enumerate(cleaned):
            item['id'] = item.get('id') or f"skill-{index + 1}"
            try:
                item['order'] = int(item.get('order') or index)
            except (TypeError, ValueError):
                item['order'] = index
        return sorted(cleaned, key=lambda item: item.get('order', 0))

    def validate_languages(self, value):
        return self._clean_item_list(value, ['name', 'level'], 'languages')

    def validate_competitions(self, value):
        return self._clean_item_list(value, ['date', 'name', 'description'], 'competitions')

    def validate_extras(self, value):
        return self._clean_item_list(value, ['type', 'date', 'name', 'description'], 'extras')

    def update(self, instance, validated_data):
        resume = self._resume_from_obj(instance)
        translation = self._translation_from_obj(instance)
        language = self.context.get('language', 'zh')

        if translation is None:
            translation = ResumeTranslation.objects.create(resume=resume, language=language)

        shared_fields = ['age', 'photo', 'is_public']
        translation_fields = [
            'full_name', 'city', 'phone', 'email', 'educations', 'skill_sections',
            'projects', 'languages', 'competitions', 'extras'
        ]

        resume_changed = []
        translation_changed = []

        for field in shared_fields:
            if field in validated_data:
                setattr(resume, field, validated_data[field])
                resume_changed.append(field)

        for field in translation_fields:
            if field in validated_data:
                setattr(translation, field, validated_data[field])
                translation_changed.append(field)

        if resume_changed:
            resume.save(update_fields=resume_changed + ['updated_at'])
        if translation_changed:
            translation.save(update_fields=translation_changed + ['updated_at'])

        return {'resume': resume, 'translation': translation}

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
            'id', 'ai_uid', 'name', 'real_name', 'aliases', 'avatar', 'system_prompt', 'model_name', 
            'temperature', 'remark', 'enabled', 'last_message', 'last_message_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['ai_uid']

    def validate_aliases(self, value):
        if value in [None, ""]:
            return []
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except Exception:
                value = [item.strip() for item in value.split(',') if item.strip()]
        if not isinstance(value, list):
            raise serializers.ValidationError("角色小名必须是列表")
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        if len(cleaned) > 3:
            raise serializers.ValidationError("角色小名最多设置 3 个")
        return cleaned[:3]

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
    sender_character_name = serializers.CharField(source='sender_character.name', read_only=True)
    sender_character_avatar = serializers.ImageField(source='sender_character.avatar', read_only=True)

    class Meta:
        model = AIMessage
        fields = [
            'id', 'conversation', 'sender_character', 'sender_character_name',
            'sender_character_avatar', 'role', 'content', 'quote', 'created_at'
        ]

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
    character_name = serializers.CharField(source='character.name', read_only=True, allow_null=True)
    character_avatar = serializers.ImageField(source='character.avatar', read_only=True, allow_null=True)
    participant_details = AICharacterSerializer(source='participants', many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = AIConversation
        fields = [
            'id', 'character', 'character_name', 'character_avatar', 
            'participants', 'participant_details', 'is_group', 'title',
            'last_message', 'created_at', 'updated_at'
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
