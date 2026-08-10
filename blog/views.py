from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.middleware.csrf import get_token
from django.http import JsonResponse, FileResponse
import mimetypes
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import Article, Category, UserProfile, Follow, AICharacter, AIProviderConfig, AIConversation, AIMessage, AIConversationSnapshot, UserWallpaper, NotebookState, DesktopState, Resume, ResumeTranslation, ResumePDF
from .forms import RegisterForm
from .serializers import (
    ArticleSerializer, CategorySerializer, UserSerializer,
    MyProfileSerializer, PublicProfileSerializer,
    AICharacterSerializer, AIProviderConfigSerializer,
    AIConversationSerializer, AIMessageSerializer, AIConversationSnapshotSerializer,
    UserWallpaperSerializer, ResumeSerializer
)
import requests
from django.utils import timezone

import os
import json
import base64
import uuid
from PIL import Image
from io import BytesIO
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import asyncio

# Global dictionary to store results for pending tasks
task_results = {}

@csrf_exempt
@require_POST
async def yolo_detect(request):
    image_file = request.FILES.get("image")
    if image_file is None:
        return JsonResponse({"error": "No image uploaded"}, status=400)

    # Get classes from request, default to [0] (person)
    classes_raw = request.POST.get("classes", "[0]")
    try:
        classes = json.loads(classes_raw)
    except Exception:
        classes = [0]

    channel_layer = get_channel_layer()
    
    # Check if we have workers
    from .consumers import active_workers
    if not active_workers:
        return JsonResponse({
            "error": "YOLO worker offline",
            "detections": [],
            "width": 0,
            "height": 0
        }, status=503)

    try:
        # 1. Read image and convert to base64
        # We need to run sync IO in a thread if we want to be truly async-friendly
        # but for small images it's fine.
        pil_img = Image.open(image_file).convert("RGB")
        buffered = BytesIO()
        pil_img.save(buffered, format="JPEG", quality=50)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        w, h = pil_img.size

        task_id = str(uuid.uuid4())
        
        # 2. Prepare task
        task_data = {
            "type": "detect",
            "task_id": task_id,
            "image": img_str,
            "classes": classes,
            "conf": 0.5
        }

        # 3. Create a future to wait for the result
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        task_results[task_id] = future

        # 4. Send task to all workers (or just one)
        await channel_layer.group_send(
            "yolo_workers",
            {
                "type": "send_task",
                "data": task_data
            }
        )

        # 5. Wait for result with timeout
        try:
            result_data = await asyncio.wait_for(future, timeout=5.0)
            return JsonResponse({
                "detections": result_data.get("detections", []),
                "width": result_data.get("width", w),
                "height": result_data.get("height", h),
                "worker": "local-laptop"
            })
        except asyncio.TimeoutError:
            return JsonResponse({"error": "Worker timeout"}, status=504)
        finally:
            if task_id in task_results:
                del task_results[task_id]

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

from pathlib import Path
from urllib.parse import unquote

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def upload_music_tracks(request):
    """
    Upload music files and save them to media/music folder.
    """
    from pathlib import Path
    from urllib.parse import quote
    
    # User requested focus on mp3, wav, ogg, flac
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac')
    
    files = request.FILES.getlist('files')
    if not files:
        return Response({"error": "No files uploaded"}, status=400)
        
    music_dir = Path(settings.MEDIA_ROOT) / "music"
    music_dir.mkdir(parents=True, exist_ok=True)
    
    saved_tracks = []
    rejected = []
    
    for file in files:
        # Security: only use basename to prevent directory traversal
        original_name = os.path.basename(file.name)
        lower_name = original_name.lower()
        
        if not lower_name.endswith(allowed_extensions):
            rejected.append(original_name)
            continue
            
        target_path = music_dir / original_name
        
        # Handle duplicate filenames: auto increment suffix
        base = target_path.stem
        ext = target_path.suffix
        counter = 1
        while target_path.exists():
            target_path = music_dir / f"{base}_{counter}{ext}"
            counter += 1
            
        try:
            with open(target_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            filename = target_path.name
            safe_filename = quote(filename)
            # Ensure URL is correctly formatted with /media/music/
            track_url = f"{settings.MEDIA_URL}music/{safe_filename}".replace('//', '/')
            file_size = target_path.stat().st_size
            
            saved_tracks.append({
                "id": filename,
                "name": filename,
                "title": target_path.stem,
                "url": track_url,
                "file_size": file_size,
                "size": file_size,
                "disabled": False
            })
        except Exception as e:
            rejected.append(f"{original_name} (error: {str(e)})")

    if rejected and not saved_tracks:
        return Response({
            "error": f"添加失败：{', '.join(rejected)} 文件格式不支持或保存失败",
            "rejected": rejected
        }, status=400)
        
    return Response({
        "success": True,
        "count": len(saved_tracks),
        "tracks": saved_tracks,
        "rejected": rejected
    })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def open_music_folder(request):
    """
    Open the media/music folder in the system file manager (Local Dev Only).
    """
    import os
    import sys
    import subprocess
    from pathlib import Path

    music_dir = Path(settings.MEDIA_ROOT) / "music"
    music_dir.mkdir(parents=True, exist_ok=True)

    try:
        if sys.platform.startswith("win"):
            os.startfile(str(music_dir))
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(music_dir)])
        else:
            subprocess.Popen(["xdg-open", str(music_dir)])

        return Response({
            "success": True,
            "path": str(music_dir)
        })
    except Exception as e:
        return Response({
            "success": False,
            "path": str(music_dir),
            "error": str(e)
        }, status=500)

@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def delete_music_track(request, filename):
    """
    Delete a music file from media/music folder.
    """
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac')
    
    filename = unquote(filename)
    # Basic security: only filename, no path components
    safe_name = os.path.basename(filename)
    
    if safe_name != filename:
        return Response({"error": "Invalid filename"}, status=400)
        
    if not safe_name.lower().endswith(allowed_extensions):
        return Response({"error": "Unsupported file type"}, status=400)
        
    music_dir = Path(settings.MEDIA_ROOT) / "music"
    file_path = music_dir / safe_name
    
    try:
        # Final security check: ensure the resolved path is inside music_dir
        file_path = file_path.resolve()
        music_dir = music_dir.resolve()
        
        if not str(file_path).startswith(str(music_dir)):
             return Response({"error": "Invalid path"}, status=400)
             
        if not file_path.exists() or not file_path.is_file():
            return Response({"error": "File not found"}, status=404)
            
        file_path.unlink()
        return Response({"success": True})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['PATCH'])
@permission_classes([permissions.AllowAny])
def rename_music_track(request, filename):
    """
    Rename a music file in media/music folder.
    """
    from urllib.parse import quote
    # User requested focus on mp3, wav, ogg, flac
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac')
    
    filename = unquote(filename)
    old_safe_name = os.path.basename(filename)
    new_name_base = request.data.get('new_name', '').strip()
    
    if not new_name_base:
        return Response({"error": "New name cannot be empty"}, status=400)
        
    if '/' in new_name_base or '\\' in new_name_base or '..' in new_name_base:
        return Response({"error": "Invalid characters in new name"}, status=400)

    if old_safe_name != filename:
        return Response({"error": "Invalid filename"}, status=400)
        
    if not old_safe_name.lower().endswith(allowed_extensions):
        return Response({"error": "Unsupported file type"}, status=400)
        
    # Extract extension from old file
    ext = os.path.splitext(old_safe_name)[1]
    new_filename = new_name_base + ext
    
    music_dir = Path(settings.MEDIA_ROOT) / "music"
    old_path = (music_dir / old_safe_name).resolve()
    new_path = (music_dir / new_filename).resolve()
    music_dir = music_dir.resolve()
    
    # Security check
    if not str(old_path).startswith(str(music_dir)) or not str(new_path).startswith(str(music_dir)):
        return Response({"error": "Invalid path"}, status=400)
        
    if not old_path.exists():
        return Response({"error": "Source file not found"}, status=404)
        
    if new_path.exists() and old_path != new_path:
        return Response({"error": "Target file already exists"}, status=409)
        
    try:
        old_path.rename(new_path)
        safe_new_filename = quote(new_filename)
        track_url = f"{settings.MEDIA_URL}music/{safe_new_filename}".replace('//', '/')
        return Response({
            "id": new_filename,
            "name": new_filename,
            "title": new_name_base,
            "url": track_url,
            "disabled": False
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_music_tracks(request):
    """
    Scan media/music folder and return list of music tracks with quota info.
    """
    from urllib.parse import quote
    import os
    from django.conf import settings
    
    music_dir = os.path.join(settings.MEDIA_ROOT, 'music')
    
    # Create directory if not exists
    if not os.path.exists(music_dir):
        os.makedirs(music_dir, exist_ok=True)
    
    tracks = []
    # User requested focus on mp3, wav, ogg, flac
    allowed_extensions = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac')
    total_used_bytes = 0
    limit_bytes = 200 * 1024 * 1024 # 200MB
    
    try:
        # Scan files in directory
        for filename in os.listdir(music_dir):
            # Security check: only allow files, no directory traversal
            file_path = os.path.join(music_dir, filename)
            if not os.path.isfile(file_path):
                continue
                
            if filename.lower().endswith(allowed_extensions):
                file_size = os.path.getsize(file_path)
                total_used_bytes += file_size
                
                # Correctly encode filename for URL
                safe_filename = quote(filename)
                track_url = f"{settings.MEDIA_URL}music/{safe_filename}".replace('//', '/')
                
                title = os.path.splitext(filename)[0]
                
                tracks.append({
                    "id": filename,
                    "name": filename,
                    "title": title,
                    "url": track_url,
                    "file_size": file_size,
                    "size": file_size,
                    "source": "remote",
                    "disabled": False
                })
        
        # Sort tracks by name
        tracks.sort(key=lambda x: x['name'])
        
        return Response({
            "tracks": tracks,
            "quota": {
                "usedBytes": total_used_bytes,
                "limitBytes": limit_bytes
            }
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- User Profile Views ---

RESUME_LANGS = {'zh', 'de', 'en'}
RESUME_LANG_LABELS = {'zh': 'ZH', 'de': 'DE', 'en': 'EN'}

def _truthy(value):
    return value in [True, 'true', 'True', '1', 1, 'yes', 'on']

def _resume_defaults(user):
    return {}

def _resume_payload_from_request(request):
    if 'payload' in request.data:
        try:
            payload = json.loads(request.data.get('payload') or '{}')
        except json.JSONDecodeError:
            return None, "payload must be valid JSON"
        if not isinstance(payload, dict):
            return None, "payload must be a JSON object"
    else:
        payload = request.data.copy()
        for key in ['educations', 'skill_sections', 'projects', 'languages', 'competitions', 'extras']:
            value = payload.get(key)
            if isinstance(value, str):
                try:
                    payload[key] = json.loads(value)
                except json.JSONDecodeError:
                    return None, f"{key} must be valid JSON"

    if 'is_public' in payload:
        payload['is_public'] = _truthy(payload.get('is_public'))

    photo = request.FILES.get('photo')
    if photo:
        payload['photo'] = photo

    return payload, ""

def _get_resume_for_username(username):
    user = get_object_or_404(User, username__iexact=username)
    resume, _ = Resume.objects.get_or_create(
        user=user,
        defaults=_resume_defaults(user),
    )
    return user, resume

def _resume_pdf_status(resume):
    existing = {item.language: item for item in resume.pdfs.all()}
    return {
        language: {
            "available": bool(existing.get(language) and existing[language].file),
            "uploaded_at": existing[language].uploaded_at if existing.get(language) else None,
        }
        for language in ['zh', 'de', 'en']
    }

def _validate_resume_pdf_file(pdf_file):
    if not pdf_file:
        return "No PDF file uploaded"
    if pdf_file.size > 15 * 1024 * 1024:
        return "PDF file cannot exceed 15MB"

    name = pdf_file.name.lower()
    content_type = (getattr(pdf_file, 'content_type', '') or '').lower()
    if not name.endswith('.pdf') or content_type not in ['application/pdf', 'application/x-pdf', '']:
        return "Only PDF files are supported"
    return ""

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.AllowAny])
def resume_detail_view(request, username):
    lang = request.query_params.get('lang', 'zh')
    if lang not in RESUME_LANGS:
        return Response({"detail": "Unsupported resume language"}, status=status.HTTP_404_NOT_FOUND)

    user, resume = _get_resume_for_username(username)
    translation = ResumeTranslation.objects.filter(resume=resume, language=lang).first()
    is_owner = request.user.is_authenticated and request.user.id == user.id

    if request.method == 'GET':
        if not resume.is_public and not is_owner:
            return Response({"detail": "Resume is not public"}, status=status.HTTP_404_NOT_FOUND)
        serializer = ResumeSerializer(
            {'resume': resume, 'translation': translation},
            context={'request': request, 'language': lang},
        )
        return Response(serializer.data)

    if not is_owner:
        detail = "Please log in to edit this resume" if not request.user.is_authenticated else "Only the resume owner can edit this resume"
        return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)

    payload, error = _resume_payload_from_request(request)
    if error:
        return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

    if _truthy(request.data.get('remove_photo')):
        if resume.photo:
            resume.photo.delete(save=False)
        payload['photo'] = None

    serializer = ResumeSerializer(
        {'resume': resume, 'translation': translation},
        data=payload,
        partial=True,
        context={'request': request, 'language': lang},
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.AllowAny])
def resume_pdf_view(request, username):
    lang = request.query_params.get('lang', 'zh')
    if lang not in RESUME_LANGS:
        return Response({"detail": "Unsupported resume language"}, status=status.HTTP_404_NOT_FOUND)

    user, resume = _get_resume_for_username(username)
    is_owner = request.user.is_authenticated and request.user.id == user.id

    if request.method == 'GET':
        if not resume.is_public and not is_owner:
            return Response({"detail": "Resume is not public"}, status=status.HTTP_404_NOT_FOUND)

        resume_pdf = ResumePDF.objects.filter(resume=resume, language=lang).first()
        if not resume_pdf or not resume_pdf.file:
            return Response({"detail": "PDF not found"}, status=status.HTTP_404_NOT_FOUND)

        filename = f"{resume.user.username}_CV_{RESUME_LANG_LABELS[lang]}.pdf"
        response = FileResponse(
            resume_pdf.file.open('rb'),
            content_type='application/pdf',
            as_attachment=True,
            filename=filename,
        )
        return response

    if not is_owner:
        detail = "Please log in to manage this resume PDF" if not request.user.is_authenticated else "Only the resume owner can manage this resume PDF"
        return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        pdf_file = request.FILES.get('file') or request.FILES.get('pdf')
        error = _validate_resume_pdf_file(pdf_file)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        resume_pdf, _ = ResumePDF.objects.get_or_create(resume=resume, language=lang)
        if resume_pdf.file:
            resume_pdf.file.delete(save=False)
        resume_pdf.file = pdf_file
        resume_pdf.save()
        return Response({"pdfs": _resume_pdf_status(resume), "language": lang})

    resume_pdf = ResumePDF.objects.filter(resume=resume, language=lang).first()
    if resume_pdf:
        if resume_pdf.file:
            resume_pdf.file.delete(save=False)
        resume_pdf.delete()
    return Response({"pdfs": _resume_pdf_status(resume), "language": lang})

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def user_profile_view(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    # Pre-calculate counts
    profile.following_count = 0
    profile.followers_count = 0
    profile.bookmarks_count = 0
    profile.likes_received = 0

    if request.method == 'GET':
        serializer = MyProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    elif request.method == 'PATCH':
        # List of allowed fields for update
        allowed_fields = [
            'display_name', 'bio', 'location', 'show_location', 
            'show_dating_profile', 'show_notes_public', 'show_bookmarks_public',
            'show_following_public', 'show_followers_public', 'is_public'
        ]
        
        # Filter data to only include allowed fields
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        serializer = MyProfileSerializer(profile, data=update_data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_profile_view(request, public_id):
    profile = get_object_or_404(UserProfile, public_id=public_id)
    
    # Check if is_public is true, unless the requester is the owner
    is_owner = request.user.is_authenticated and request.user == profile.user
    if not profile.is_public and not is_owner:
        return Response({"detail": "该主页未公开"}, status=status.HTTP_404_NOT_FOUND)
    
    # Pre-calculate counts
    profile.following_count = 0
    profile.followers_count = 0
    profile.likes_received = 0
    
    serializer = PublicProfileSerializer(profile, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_user_notes_view(request, public_id):
    profile = get_object_or_404(UserProfile, public_id=public_id)
    
    # Check if is_public is true, unless the requester is the owner
    is_owner = request.user.is_authenticated and request.user == profile.user
    if not profile.is_public and not is_owner:
        return Response({"detail": "该主页未公开"}, status=status.HTTP_404_NOT_FOUND)
        
    # Check if notes are public
    if not profile.show_notes_public and not is_owner:
        return Response([], status=status.HTTP_200_OK) # Return empty list if locked
        
    queryset = Article.objects.filter(author=profile.user)
    
    if not is_owner:
        # For non-owners, only show public and published notes
        queryset = queryset.filter(visibility='public', is_published=True)
    # else: owners see everything
    
    queryset = queryset.order_by('-created_at')
    serializer = ArticleSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def notebook_state_view(request):
    notebook, created = NotebookState.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response({
            "data": notebook.data,
            "schema_version": notebook.schema_version,
            "updated_at": notebook.updated_at,
            "is_empty": not bool(notebook.data),
        })

    state_data = request.data.get("data")
    if not isinstance(state_data, dict):
        return Response(
            {"error": "data must be a JSON object"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    schema_version = request.data.get("schema_version", 2)
    if type(schema_version) is not int or schema_version < 1:
        return Response(
            {"error": "schema_version must be a positive integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    notebook.data = state_data
    notebook.schema_version = schema_version
    notebook.save()

    return Response({
        "message": "saved",
        "data": notebook.data,
        "schema_version": notebook.schema_version,
        "updated_at": notebook.updated_at,
    })

@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def desktop_state_view(request):
    desktop, created = DesktopState.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response({
            "data": desktop.data,
            "schema_version": desktop.schema_version,
            "updated_at": desktop.updated_at,
            "is_empty": not bool(desktop.data),
        })

    state_data = request.data.get("data")
    if not isinstance(state_data, dict):
        return Response(
            {"error": "data must be a JSON object"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    schema_version = request.data.get("schema_version", 1)
    if type(schema_version) is not int or schema_version < 1:
        return Response(
            {"error": "schema_version must be a positive integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    desktop.data = state_data
    desktop.schema_version = schema_version
    desktop.save()

    return Response({
        "message": "saved",
        "data": desktop.data,
        "schema_version": desktop.schema_version,
        "updated_at": desktop.updated_at,
    })

# --- Follow System Views ---

@api_view(['POST', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def follow_user_view(request, public_id):
    target_profile = get_object_or_404(UserProfile, public_id=public_id)
    target_user = target_profile.user
    
    if request.user == target_user:
        return Response({"error": "不能关注自己"}, status=status.HTTP_400_BAD_REQUEST)
        
    if request.method == 'POST':
        follow, created = Follow.objects.get_or_create(follower=request.user, following=target_user)
        if created:
            return Response({"message": "关注成功", "relation_status": "following"}, status=status.HTTP_201_CREATED)
        return Response({"message": "已经关注过了"}, status=status.HTTP_200_OK)
        
    elif request.method == 'DELETE':
        Follow.objects.filter(follower=request.user, following=target_user).delete()
        return Response({"message": "已取消关注", "relation_status": "none"}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_following_view(request, public_id):
    profile = get_object_or_404(UserProfile, public_id=public_id)
    
    # Privacy Check
    is_owner = request.user.is_authenticated and request.user == profile.user
    if not profile.show_following_public and not is_owner:
        return Response({"detail": "该用户已锁定关注列表"}, status=status.HTTP_403_FORBIDDEN)

    # Get users that this profile follows
    following_users = User.objects.filter(followers__follower=profile.user)
    
    profiles = UserProfile.objects.filter(user__in=following_users)
    serializer = PublicProfileSerializer(profiles, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_followers_view(request, public_id):
    profile = get_object_or_404(UserProfile, public_id=public_id)

    # Privacy Check
    is_owner = request.user.is_authenticated and request.user == profile.user
    if not profile.show_followers_public and not is_owner:
        return Response({"detail": "该用户已锁定粉丝列表"}, status=status.HTTP_403_FORBIDDEN)

    # Get users that follow this profile
    followers_users = User.objects.filter(following__following=profile.user)
    
    profiles = UserProfile.objects.filter(user__in=followers_users)
    serializer = PublicProfileSerializer(profiles, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_user_avatar(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    avatar_file = request.FILES.get('avatar')
    avatar_original = request.FILES.get('original')
    
    if not avatar_file:
        return Response({"error": "未提供头像文件"}, status=400)
    
    # Validation: Size (5MB)
    if avatar_file.size > 5 * 1024 * 1024:
        return Response({"error": "文件大小不能超过 5MB"}, status=400)
    
    # Validation: Type
    ext = os.path.splitext(avatar_file.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return Response({"error": "仅支持 JPG, JPEG, PNG, WEBP 格式"}, status=400)
    
    # Cleanup old files
    if profile.avatar:
        try:
            if os.path.isfile(profile.avatar.path):
                os.remove(profile.avatar.path)
        except Exception: pass
    if profile.avatar_original:
        try:
            if os.path.isfile(profile.avatar_original.path):
                os.remove(profile.avatar_original.path)
        except Exception: pass
    
    profile.avatar = avatar_file
    if avatar_original:
        profile.avatar_original = avatar_original
        
    profile.save()
    return Response({
        "avatar": profile.avatar.url, 
        "avatar_original": profile.avatar_original.url if profile.avatar_original else profile.avatar.url,
        "message": "头像上传成功"
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_user_cover(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    cover_file = request.FILES.get('cover')
    cover_original = request.FILES.get('original')
    
    if not cover_file:
        return Response({"error": "未提供封面文件"}, status=400)
    
    # Validation: Size (5MB)
    if cover_file.size > 5 * 1024 * 1024:
        return Response({"error": "文件大小不能超过 5MB"}, status=400)
    
    # Validation: Type
    ext = os.path.splitext(cover_file.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return Response({"error": "仅支持 JPG, JPEG, PNG, WEBP 格式"}, status=400)
    
    # Cleanup old files
    if profile.cover_image:
        try:
            if os.path.isfile(profile.cover_image.path):
                os.remove(profile.cover_image.path)
        except Exception: pass
    if profile.cover_image_original:
        try:
            if os.path.isfile(profile.cover_image_original.path):
                os.remove(profile.cover_image_original.path)
        except Exception: pass
    
    profile.cover_image = cover_file
    if cover_original:
        profile.cover_image_original = cover_original
        
    profile.save()
    return Response({
        "cover_image": profile.cover_image.url, 
        "cover_image_original": profile.cover_image_original.url if profile.cover_image_original else profile.cover_image.url,
        "message": "封面上传成功"
    })

class UserWallpaperViewSet(viewsets.ModelViewSet):
    serializer_class = UserWallpaperSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserWallpaper.objects.filter(user=self.request.user)

    def _validate_image_file(self, image_file):
        if image_file.size > 4 * 1024 * 1024:
            return "文件大小不能超过 4MB"

        ext = os.path.splitext(image_file.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            return "仅支持 JPG, JPEG, PNG, WEBP 格式"
        return ""

    def _delete_wallpaper_files(self, wallpaper):
        for field in ['image', 'original_image', 'pc_image', 'mobile_image']:
            file_field = getattr(wallpaper, field, None)
            if file_field:
                try:
                    if os.path.isfile(file_field.path):
                        os.remove(file_field.path)
                except Exception:
                    pass

    def create(self, request, *args, **kwargs):
        image_file = request.FILES.get('image') or request.FILES.get('pc_image') or request.FILES.get('original_image')
        original_file = request.FILES.get('original_image') or image_file
        pc_file = request.FILES.get('pc_image') or image_file
        mobile_file = request.FILES.get('mobile_image') or image_file

        if not image_file:
            return Response({"error": "未提供图片文件"}, status=400)

        seen_files = set()
        for file_obj in [image_file, original_file, pc_file, mobile_file]:
            marker = id(file_obj)
            if marker in seen_files:
                continue
            seen_files.add(marker)
            error = self._validate_image_file(file_obj)
            if error:
                return Response({"error": error}, status=400)

        name = request.data.get('name', '').strip()[:15] or os.path.splitext(image_file.name)[0][:15] or "自定义壁纸"

        wallpaper = UserWallpaper.objects.create(
            user=request.user,
            name=name,
            image=image_file,
            original_image=original_file,
            pc_image=pc_file,
            mobile_image=mobile_file,
        )
        serializer = self.get_serializer(wallpaper, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        wallpaper = self.get_object()

        if 'name' in request.data:
            name = request.data.get('name', '').strip()
            if not name or len(name) > 15:
                return Response({"error": "名称限制 1～15 字"}, status=400)
            wallpaper.name = name

        replacement_fields = ['image', 'original_image', 'pc_image', 'mobile_image']
        replaced_any = False
        for field in replacement_fields:
            file_obj = request.FILES.get(field)
            if not file_obj:
                continue
            error = self._validate_image_file(file_obj)
            if error:
                return Response({"error": error}, status=400)
            old_file = getattr(wallpaper, field)
            if old_file:
                try:
                    if os.path.isfile(old_file.path):
                        os.remove(old_file.path)
                except Exception:
                    pass
            setattr(wallpaper, field, file_obj)
            if field in ['image', 'pc_image']:
                wallpaper.image = file_obj
            replaced_any = True

        if replaced_any and not wallpaper.image:
            wallpaper.image = wallpaper.pc_image or wallpaper.original_image or wallpaper.mobile_image

        wallpaper.save()
        serializer = self.get_serializer(wallpaper, context={'request': request})
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        wallpaper = self.get_object()
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        deleted_id = wallpaper.id
        fallback = "/wallpapers/default1.png"

        shortcuts = _normalized_shortcuts(profile.wallpaper_shortcuts)
        shortcuts_changed = False
        for index, shortcut in enumerate(shortcuts):
            if shortcut and shortcut.get('type') == 'custom' and str(shortcut.get('id')) == str(deleted_id):
                shortcuts[index] = None
                shortcuts_changed = True

        was_current = (
            profile.current_wallpaper_object_id == deleted_id
            or profile.current_wallpaper in [
                wallpaper.image.url if wallpaper.image else "",
                wallpaper.pc_image.url if wallpaper.pc_image else "",
                wallpaper.mobile_image.url if wallpaper.mobile_image else "",
                wallpaper.original_image.url if wallpaper.original_image else "",
            ]
        )

        self._delete_wallpaper_files(wallpaper)
        wallpaper.delete()

        if was_current:
            profile.current_background_type = "image"
            profile.current_wallpaper_kind = "default"
            profile.current_wallpaper_object = None
            profile.current_wallpaper = fallback
        if shortcuts_changed:
            profile.wallpaper_shortcuts = shortcuts
        if was_current or shortcuts_changed:
            profile.save()

        return Response({
            "success": True,
            "fallback_wallpaper": fallback if was_current else "",
            "shortcuts": shortcuts,
            "current_wallpaper": profile.current_wallpaper,
            "current_background_type": profile.current_background_type,
        })


def _normalized_shortcuts(value):
    if not isinstance(value, list):
        value = []
    shortcuts = list(value[:6])
    while len(shortcuts) < 6:
        shortcuts.append(None)
    return shortcuts


def _wallpaper_url_for_mode(wallpaper, mode):
    if not wallpaper:
        return ""
    if mode == "mobile" and wallpaper.mobile_image:
        return wallpaper.mobile_image.url
    if mode == "original" and wallpaper.original_image:
        return wallpaper.original_image.url
    if wallpaper.pc_image:
        return wallpaper.pc_image.url
    if wallpaper.image:
        return wallpaper.image.url
    if wallpaper.original_image:
        return wallpaper.original_image.url
    return ""


def _serialize_theme_state(request, profile, user_wallpapers=None):
    if user_wallpapers is None:
        user_wallpapers = UserWallpaper.objects.filter(user=request.user) if request.user.is_authenticated else []

    current_value = profile.current_background_color if profile.current_background_type == "color" else profile.current_wallpaper

    return {
        "user_wallpapers": UserWallpaperSerializer(user_wallpapers, many=True, context={'request': request}).data,
        "shortcuts": _normalized_shortcuts(profile.wallpaper_shortcuts),
        "current_wallpaper": profile.current_wallpaper,
        "current_background_type": profile.current_background_type,
        "current_background_color": profile.current_background_color,
        "current_wallpaper_mode": profile.current_wallpaper_mode,
        "current_wallpaper_kind": profile.current_wallpaper_kind,
        "current_wallpaper_id": profile.current_wallpaper_object_id,
        "current_value": current_value,
    }

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def set_current_wallpaper(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    mode = request.data.get('mode') or profile.current_wallpaper_mode or "pc"
    selection_type = request.data.get('selection_type') or request.data.get('type')

    if 'shortcuts' in request.data:
        profile.wallpaper_shortcuts = _normalized_shortcuts(request.data.get('shortcuts'))

    if 'color' in request.data:
        color = request.data.get('color', '').strip()
        if color.startswith('#') and len(color) in [4, 7]:
            profile.current_background_color = color
        elif selection_type == "color":
            return Response({"error": "颜色格式无效"}, status=400)

    if selection_type == "color":
        profile.current_background_type = "color"
        profile.current_wallpaper_mode = mode
    elif selection_type == "custom":
        wallpaper_id = request.data.get('wallpaper_id')
        wallpaper = get_object_or_404(UserWallpaper, id=wallpaper_id, user=request.user)
        profile.current_background_type = "image"
        profile.current_wallpaper_kind = "custom"
        profile.current_wallpaper_object = wallpaper
        profile.current_wallpaper_mode = mode
        profile.current_wallpaper = _wallpaper_url_for_mode(wallpaper, mode)
    elif selection_type == "default":
        wallpaper_path = request.data.get('wallpaper') or "/wallpapers/default1.png"
        profile.current_background_type = "image"
        profile.current_wallpaper_kind = "default"
        profile.current_wallpaper_object = None
        profile.current_wallpaper_mode = mode
        profile.current_wallpaper = wallpaper_path
    elif request.data.get('wallpaper'):
        wallpaper_path = request.data.get('wallpaper')
        profile.current_background_type = "image"
        profile.current_wallpaper_kind = "default" if wallpaper_path.startswith('/wallpapers/') else "custom"
        profile.current_wallpaper_object = None
        profile.current_wallpaper_mode = mode
        profile.current_wallpaper = wallpaper_path
    elif 'shortcuts' not in request.data and 'color' not in request.data:
        return Response({"error": "未提供壁纸设置"}, status=400)

    profile.save()
    return Response({"success": True, **_serialize_theme_state(request, profile)})

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_all_wallpapers(request):
    if request.user.is_authenticated:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(_serialize_theme_state(request, profile))

    return Response({
        "user_wallpapers": [],
        "shortcuts": [None, None, None, None, None, None],
        "current_wallpaper": "",
        "current_background_type": "image",
        "current_background_color": "#f5f5f5",
        "current_wallpaper_mode": "pc",
        "current_wallpaper_kind": "default",
        "current_wallpaper_id": None,
        "current_value": "",
    })

# --- AI Assistant Views ---

class AICharacterViewSet(viewsets.ModelViewSet):
    serializer_class = AICharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AICharacter.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class AIConversationViewSet(viewsets.ModelViewSet):
    serializer_class = AIConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AIConversation.objects.filter(user=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        conversation = serializer.save(user=self.request.user)
        if conversation.is_group:
            participant_ids = self.request.data.get('participants', [])
            if isinstance(participant_ids, str):
                try:
                    participant_ids = json.loads(participant_ids)
                except Exception:
                    participant_ids = [item for item in participant_ids.split(',') if item]
            participants = AICharacter.objects.filter(user=self.request.user, id__in=participant_ids)
            conversation.participants.set(participants)

    def perform_update(self, serializer):
        conversation = serializer.save()
        if conversation.is_group and 'participants' in self.request.data:
            participant_ids = self.request.data.get('participants', [])
            if isinstance(participant_ids, str):
                try:
                    participant_ids = json.loads(participant_ids)
                except Exception:
                    participant_ids = [item for item in participant_ids.split(',') if item]
            participants = AICharacter.objects.filter(user=self.request.user, id__in=participant_ids)
            conversation.participants.set(participants)

    @action(detail=True, methods=['post'])
    def clear_messages(self, request, pk=None):
        conversation = self.get_object()
        conversation.messages.all().delete()
        return Response({"success": True})

class AIConversationSnapshotViewSet(viewsets.ModelViewSet):
    serializer_class = AIConversationSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response({"ok": False, "message": f"获取存档列表失败: {str(e)}"}, status=400)

    def get_queryset(self):
        queryset = AIConversationSnapshot.objects.filter(user=self.request.user)
        ai_uid = self.request.query_params.get('ai_uid')
        
        if ai_uid:
            queryset = queryset.filter(ai_uid=ai_uid)
            
        return queryset

    def create(self, request, *args, **kwargs):
        try:
            ai_uid = request.data.get('ai_uid')
            character_id = request.data.get('character_id')
            conversation_id = request.data.get('conversation_id')
            slot_index = request.data.get('slot_index')
            custom_name = request.data.get('custom_name', '')

            if not ai_uid or not character_id or not conversation_id or not slot_index:
                return Response({"ok": False, "message": "缺少必要参数"}, status=400)

            slot_index = int(slot_index)
            if slot_index not in [1, 2, 3]:
                return Response({"ok": False, "message": "无效的槽位编号，必须为 1, 2 或 3"}, status=400)

            conversation = get_object_or_404(AIConversation, id=conversation_id, user=request.user)
            character = conversation.character
            
            # Security Check: Ensure character matches ai_uid
            if character.ai_uid != ai_uid:
                return Response({"ok": False, "message": "角色识别码不匹配，禁止跨角色覆盖存档"}, status=403)

            messages = conversation.messages.all().order_by('created_at')
            if not messages.exists():
                return Response({"ok": False, "message": "当前聊天记录为空，无法保存"}, status=400)

            # Serialize messages to JSON
            messages_data = AIMessageSerializer(messages, many=True).data
            
            # Use update_or_create based on ai_uid
            snapshot, created = AIConversationSnapshot.objects.update_or_create(
                user=request.user,
                ai_uid=ai_uid,
                slot_index=slot_index,
                defaults={
                    'character': character,
                    'character_name': character.name,
                    'character_avatar_url': character.avatar.url if character.avatar else None,
                    'character_model_name': character.model_name,
                    'conversation': conversation,
                    'custom_name': custom_name,
                    'name': custom_name or f"存档 {slot_index}",
                    'messages_json': messages_data,
                    'message_count': messages.count(),
                    'saved_at': timezone.now()
                }
            )

            return Response({
                "ok": True, 
                "message": "保存成功" if created else "覆盖保存成功",
                "data": AIConversationSnapshotSerializer(snapshot).data
            })
        except Exception as e:
            return Response({"ok": False, "message": str(e)}, status=400)

    def partial_update(self, request, *args, **kwargs):
        # Handle rename
        try:
            instance = self.get_object()
            custom_name = request.data.get('custom_name')
            if custom_name is not None:
                instance.custom_name = custom_name
                instance.name = custom_name or f"存档 {instance.slot_index}"
                instance.save()
                return Response({"ok": True, "message": "重命名成功", "data": AIConversationSnapshotSerializer(instance).data})
            return Response({"ok": False, "message": "缺少参数 custom_name"}, status=400)
        except Exception as e:
            return Response({"ok": False, "message": str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def groups(self, request):
        try:
            from django.db.models import Count, Max
            groups = AIConversationSnapshot.objects.filter(user=request.user)\
                .values('ai_uid')\
                .annotate(
                    character_name=Max('character_name'),
                    avatar_url=Max('character_avatar_url'),
                    snapshot_count=Count('id'),
                    last_saved_at=Max('saved_at'),
                    character_id=Max('character_id')
                ).order_by('-last_saved_at')
            
            return Response(list(groups))
        except Exception as e:
            return Response({"ok": False, "message": str(e)}, status=400)

    @action(detail=False, methods=['post'], url_path='delete-group')
    def delete_group(self, request):
        try:
            ai_uid = request.data.get('ai_uid')
            if not ai_uid:
                return Response({"ok": False, "message": "缺少 ai_uid"}, status=400)
            
            AIConversationSnapshot.objects.filter(user=request.user, ai_uid=ai_uid).delete()
            return Response({"ok": True, "message": "已删除该角色的所有存档"})
        except Exception as e:
            return Response({"ok": False, "message": str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        try:
            snapshot = self.get_object()
            conversation_id = request.data.get('conversation_id')
            
            # Find character by ai_uid
            target_char = AICharacter.objects.filter(user=request.user, ai_uid=snapshot.ai_uid).first()
            
            if not target_char:
                # Character deleted, rebuild it
                target_char = AICharacter.objects.create(
                    user=request.user,
                    ai_uid=snapshot.ai_uid,
                    name=snapshot.character_name,
                    model_name=snapshot.character_model_name,
                    # We can't easily restore the ImageField from a URL string here, 
                    # but we can leave it empty or implement a downloader if needed.
                    # For now, keeping it simple as per instructions.
                    system_prompt=f"我是 {snapshot.character_name}，欢迎回来。",
                )


            # Find or create conversation for the target character
            if conversation_id:
                conversation = get_object_or_404(AIConversation, id=conversation_id, user=request.user)
                # Ensure conversation belongs to the right character
                if conversation.character_id != target_char.id:
                    conversation, _ = AIConversation.objects.get_or_create(
                        user=request.user,
                        character=target_char,
                        defaults={'title': f"与 {target_char.name} 的对话"}
                    )
            else:
                conversation, _ = AIConversation.objects.get_or_create(
                    user=request.user,
                    character=target_char,
                    defaults={'title': f"与 {target_char.name} 的对话"}
                )
            
            # 1. Clear current messages in DB
            conversation.messages.all().delete()
            
            # 2. Re-create messages in DB from snapshot
            new_messages = []
            for msg in snapshot.messages_json:
                original_created_at = msg.get('created_at') or snapshot.saved_at or timezone.now()
                
                new_msg = AIMessage.objects.create(
                    conversation=conversation,
                    role=msg.get('role'),
                    content=msg.get('content'),
                    quote=msg.get('quote'),
                    created_at=original_created_at
                )
                new_messages.append(new_msg)
            
            # 3. Update conversation timestamp
            conversation.updated_at = timezone.now()
            conversation.save()
            
            # 4. Serialize newly created messages
            messages_data = AIMessageSerializer(new_messages, many=True).data
            
            return Response({
                "ok": True, 
                "message": "聊天记录已恢复", 
                "conversation_id": conversation.id,
                "messages": messages_data
            })
        except Exception as e:
            return Response({"ok": False, "message": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_conversation_messages(request, conversation_id):
    messages = AIMessage.objects.filter(
        conversation_id=conversation_id,
        conversation__user=request.user
    ).order_by('created_at')
    serializer = AIMessageSerializer(messages, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_settings_view(request):
    config, created = AIProviderConfig.objects.get_or_create(user=request.user)
    if request.method == 'GET':
        serializer = AIProviderConfigSerializer(config, context={'request': request})
        return Response(serializer.data)
    elif request.method == 'POST':
        data = request.data.copy()
        # If api_key is blank, don't update it
        if not data.get('api_key'):
            data.pop('api_key', None)
            
        serializer = AIProviderConfigSerializer(config, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def test_ai_connection(request):
    base_url = request.data.get('base_url', 'https://api.deepseek.com')
    api_key = request.data.get('api_key')
    model = request.data.get('default_model', 'deepseek-chat')

    # If api_key is not provided, try to use the saved one
    if not api_key:
        config = AIProviderConfig.objects.filter(user=request.user).first()
        if config and config.api_key:
            api_key = config.api_key

    if not api_key:
        return Response({"ok": False, "message": "API Key is required"}, status=200)

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 5
        }
        # DeepSeek uses /v1/chat/completions for OpenAI compatibility
        url = f"{base_url.rstrip('/')}/chat/completions"
        
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=10)
        except requests.exceptions.Timeout:
            return Response({"ok": False, "message": "连接超时，请检查服务器网络或 API 地址"}, status=200)
        except requests.exceptions.ConnectionError:
            return Response({"ok": False, "message": "连接失败，请检查 API 地址是否正确"}, status=200)
        
        if response.status_code == 200:
            return Response({"ok": True, "message": "连接成功"})
        elif response.status_code == 401:
            return Response({"ok": False, "message": "API Key 无效或权限不足"}, status=200)
        else:
            logger.error(f"AI Test Connection Error: {response.status_code} - {response.text}")
            return Response({
                "ok": False, 
                "message": f"连接失败 (HTTP {response.status_code})",
                "detail": response.text
            }, status=200)
    except Exception as e:
        import traceback
        logger.error(f"AI Test Connection Exception: {str(e)}\n{traceback.format_exc()}")
        return Response({"ok": False, "message": f"系统错误: {str(e)}"}, status=200)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_chat_view(request):
    conversation_id = request.data.get('conversation_id')
    user_content = request.data.get('message')
    quote_data = request.data.get('quote')

    if not conversation_id or not user_content:
        return Response({"error": "conversation_id and message are required"}, status=400)

    conversation = get_object_or_404(AIConversation, id=conversation_id, user=request.user)
    character = conversation.character
    config = AIProviderConfig.objects.filter(user=request.user, enabled=True).first()

    if not config or not config.api_key:
        return Response({"error": "AI provider not configured or API key missing"}, status=400)

    # 1. Save user message
    user_msg = AIMessage.objects.create(conversation=conversation, role='user', content=user_content, quote=quote_data)

    if conversation.is_group:
        participants = list(conversation.participants.filter(user=request.user, enabled=True))
        if not participants:
            return Response({"error": "群聊中还没有可用 AI 人物"}, status=400)

        def names_for(character):
            names = [character.name, character.real_name]
            names.extend(character.aliases or [])
            return [name for name in names if name]

        assistant_messages = []
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        url = f"{config.base_url.rstrip('/')}/chat/completions"
        history = list(AIMessage.objects.filter(conversation=conversation).order_by('-created_at')[:12])
        history = list(reversed(history))
        member_names = "、".join([p.real_name or p.name for p in participants])

        try:
            responders = []
            for character in participants:
                identity_names = "、".join(names_for(character))
                judge_messages = [{
                    "role": "system",
                    "content": (
                        f"你正在参与一个群聊，群成员包括：{member_names}。\n"
                        f"你当前扮演：{character.name}。角色姓名：{character.real_name or character.name}。"
                        f"可被称呼的小名/别名：{identity_names}。\n"
                        "你的任务不是正式回复，而是判断用户刚才这句话是否需要你这个角色发言。\n"
                        "如果用户明确对你说话、询问你、@你、用你的昵称/姓名/小名呼叫你，或者从语义上明显需要你回应，回答 REPLY。\n"
                        "如果只是提到你、谈论你，或者明显是在和别人说话，不需要你插话，回答 SILENT。\n"
                        "只能输出 REPLY 或 SILENT，不要解释。"
                    )
                }]
                for h in history:
                    if h.role == 'assistant':
                        speaker = h.sender_character.name if h.sender_character else 'AI'
                        judge_messages.append({"role": "assistant", "content": f"{speaker}: {h.content}"})
                    else:
                        judge_messages.append({"role": h.role, "content": h.content})

                judge_data = {
                    "model": character.model_name or config.default_model,
                    "messages": judge_messages,
                    "temperature": 0,
                    "stream": False
                }
                judge_response = requests.post(url, headers=headers, json=judge_data, timeout=30)
                if judge_response.status_code != 200:
                    return Response({
                        "error": f"API Error: {judge_response.status_code}",
                        "detail": judge_response.text
                    }, status=status.HTTP_502_BAD_GATEWAY)

                decision = judge_response.json()['choices'][0]['message']['content'].strip().upper()
                if decision.startswith('REPLY'):
                    responders.append(character)

            for character in responders:
                identity_names = "、".join(names_for(character))
                api_messages = [{
                    "role": "system",
                    "content": (
                        f"你正在参与一个群聊，群成员包括：{member_names}。\n"
                        f"你当前扮演：{character.name}。角色姓名：{character.real_name or character.name}。"
                        f"可被称呼的小名/别名：{identity_names}。\n"
                        f"{character.system_prompt}\n"
                        "只以你这个角色的身份回复，内容自然、简洁，不要代替其他角色说话。"
                    )
                }]
                for h in history:
                    if h.role == 'assistant':
                        speaker = h.sender_character.name if h.sender_character else 'AI'
                        api_messages.append({"role": "assistant", "content": f"{speaker}: {h.content}"})
                    else:
                        api_messages.append({"role": h.role, "content": h.content})

                data = {
                    "model": character.model_name or config.default_model,
                    "messages": api_messages,
                    "temperature": character.temperature,
                    "stream": False
                }
                response = requests.post(url, headers=headers, json=data, timeout=30)
                if response.status_code != 200:
                    return Response({
                        "error": f"API Error: {response.status_code}",
                        "detail": response.text
                    }, status=status.HTTP_502_BAD_GATEWAY)

                resp_data = response.json()
                assistant_content = resp_data['choices'][0]['message']['content']
                assistant_messages.append(AIMessage.objects.create(
                    conversation=conversation,
                    sender_character=character,
                    role='assistant',
                    content=assistant_content
                ))

            conversation.save()
            return Response({
                "user_message": AIMessageSerializer(user_msg).data,
                "assistant_messages": AIMessageSerializer(assistant_messages, many=True).data,
                "assistant_message": AIMessageSerializer(assistant_messages[-1]).data if assistant_messages else None,
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    # 2. Prepare messages for API
    if not character:
        return Response({"error": "该会话没有绑定 AI 角色"}, status=400)

    api_messages = [
        {"role": "system", "content": character.system_prompt}
    ]
    
    # Add history (last 10 messages)
    history = AIMessage.objects.filter(conversation=conversation).order_by('-created_at')[:11]
    history = list(reversed(history))
    for h in history:
        api_messages.append({"role": h.role, "content": h.content})

    # 3. Call DeepSeek API
    try:
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": character.model_name or config.default_model,
            "messages": api_messages,
            "temperature": character.temperature,
            "stream": False # For now, we'll do non-streaming
        }
        url = f"{config.base_url.rstrip('/')}/chat/completions"
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            resp_data = response.json()
            assistant_content = resp_data['choices'][0]['message']['content']
            
            # 4. Save assistant message
            assistant_msg = AIMessage.objects.create(
                conversation=conversation, 
                sender_character=character,
                role='assistant', 
                content=assistant_content
            )
            
            # Update conversation timestamp
            conversation.save() # Updates updated_at
            
            return Response({
                "user_message": AIMessageSerializer(user_msg).data,
                "assistant_message": AIMessageSerializer(assistant_msg).data
            })
        else:
            return Response({
                "error": f"API Error: {response.status_code}",
                "detail": response.text
            }, status=status.HTTP_502_BAD_GATEWAY)
            
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- Template Views ---
# ... (existing template views)

# --- API Views ---

class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Article.objects.filter(is_published=True)
    serializer_class = ArticleSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        category_slug = self.request.query_params.get('category')
        query = self.request.query_params.get('q')
        
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) | Q(content__icontains=query)
            )
        return queryset

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_csrf_token(request):
    return Response({'csrfToken': get_token(request)})

@api_view(['GET'])
def get_user_info(request):
    if request.user.is_authenticated:
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    return Response({'detail': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({"success": True, "username": user.username})
    return Response({"success": False, "error": "用户名或密码错误"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_register(request):
    form = RegisterForm(data=request.data)
    if form.is_valid():
        user = form.save()
        login(request, user)
        return Response(UserSerializer(user).data)
    return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def api_logout(request):
    logout(request)
    return Response({'detail': 'Logged out'})


@login_required
def index(request):
    articles = Article.objects.filter(is_published=True)
    categories = Category.objects.all()
    current_category = None
    return render(request, 'blog/index.html', {
        'articles': articles,
        'categories': categories,
        'current_category': current_category
    })

@login_required
def category_posts(request, slug):
    category = get_object_or_404(Category, slug=slug)
    articles = Article.objects.filter(category=category, is_published=True)
    categories = Category.objects.all()
    return render(request, 'blog/index.html', {
        'articles': articles,
        'categories': categories,
        'current_category': category
    })

@login_required
def post_detail(request, slug):
    article = get_object_or_404(Article, slug=slug, is_published=True)
    return render(request, 'blog/detail.html', {'article': article})

@login_required
def search(request):
    query = request.GET.get('q', '')
    if query:
        articles = Article.objects.filter(
            Q(title__icontains=query) | Q(content__icontains=query),
            is_published=True
        )
    else:
        articles = Article.objects.none()
    
    return render(request, 'blog/search.html', {
        'articles': articles,
        'query': query
    })

def login_register_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    
    login_form = AuthenticationForm()
    register_form = RegisterForm()
    active_tab = 'login'

    if request.method == 'POST':
        if 'login_submit' in request.POST:
            active_tab = 'login'
            login_form = AuthenticationForm(data=request.POST)
            if login_form.is_valid():
                user = login_form.get_user()
                login(request, user)
                return redirect('index')
        elif 'register_submit' in request.POST:
            active_tab = 'register'
            register_form = RegisterForm(data=request.POST)
            if register_form.is_valid():
                user = register_form.save()
                login(request, user)
                return redirect('index')

    return render(request, 'blog/login.html', {
        'login_form': login_form,
        'register_form': register_form,
        'active_tab': active_tab
    })

def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def profile_view(request):
    user_articles = Article.objects.filter(author=request.user)
    return render(request, 'blog/profile.html', {
        'user': request.user,
        'articles': user_articles,
        'article_count': user_articles.count()
    })

def handler404(request, exception):
    return render(request, 'blog/404.html', status=404)

def vue_app(request):
    """
    Serve the Vue SPA. If the path matches a file in dist/ (like a JSON file or icon), 
    serve that file directly. Otherwise, serve index.html for SPA routing.
    """
    path = request.path.lstrip('/')
    if path:
        # Check if file exists in dist directory
        dist_file = os.path.join(settings.BASE_DIR, 'dist', path)
        if os.path.exists(dist_file) and os.path.isfile(dist_file):
            content_type, _ = mimetypes.guess_type(dist_file)
            return FileResponse(open(dist_file, 'rb'), content_type=content_type)
            
    return render(request, 'index.html')

