import os
import re
import json
import random
import logging
import hashlib
import string
import secrets
from django.utils import timezone
from django.contrib.auth.models import User
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.csrf import csrf_protect
import base64
from PIL import Image
from io import BytesIO

from .models import InvitationCode, UserProfile

logger = logging.getLogger(__name__)

# 1. 验证内推码
@csrf_protect
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_verify_invitation_code(request):
    try:
        data = json.loads(request.body)
        invitation_code = data.get('invitation_code', data.get('code', '')).strip()
        
        if not invitation_code or len(invitation_code) != 10 or not invitation_code.isalnum():
            return JsonResponse({'error': '格式错误'}, status=400)
            
        inv_code = InvitationCode.objects.filter(code=invitation_code).first()
        if not inv_code:
            return JsonResponse({'error': '邀请码无效'}, status=400)
            
        # 验证是否有效
        if not inv_code.is_active:
            return JsonResponse({'error': '邀请码无效'}, status=400)
        
        # 验证是否过期
        if inv_code.expires_at and inv_code.expires_at < timezone.now():
            return JsonResponse({'error': '邀请码过期'}, status=400)
            
        return JsonResponse({'success': True, 'message': '验证成功'})
    except Exception as e:
        return JsonResponse({'error': '验证失败'}, status=500)

import re

# 2. 验证账户名
@csrf_protect
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_check_username(request):
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        
        if not username:
            return JsonResponse({'error': '不能为空'}, status=400)
            
        if len(username) > 15:
            return JsonResponse({'error': '最多15字'}, status=400)
            
        if not re.match(r'^[A-Za-z0-9\u4e00-\u9fff]+$', username):
            return JsonResponse({'error': '格式错误'}, status=400)
            
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': '账户名已占用'}, status=400)
            
        return JsonResponse({'success': True, 'message': '账户名可用'})
    except Exception as e:
        return JsonResponse({'error': '验证失败'}, status=500)

# 3. 获取/刷新图片验证码
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_get_captcha(request):
    from PIL import ImageDraw, ImageFont
    width, height = 120, 40
    image = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(image)
    
    # Draw noise
    for _ in range(40):
        x1, y1 = random.randint(0, width), random.randint(0, height)
        x2, y2 = random.randint(0, width), random.randint(0, height)
        draw.line((x1, y1, x2, y2), fill=(random.randint(150, 255), random.randint(150, 255), random.randint(150, 255)))
    
    # Generate text
    chars = string.ascii_letters + string.digits
    captcha_text = ''.join(random.choice(chars) for _ in range(4))
    
    # Save to session (case insensitive)
    request.session['captcha_code'] = captcha_text.lower()
    
    # Draw text
    try:
        font = ImageFont.truetype('arial.ttf', 24)
    except IOError:
        font = ImageFont.load_default()
        
    for i, char in enumerate(captcha_text):
        draw.text((10 + i * 25, 5), char, font=font, fill=(random.randint(0, 150), random.randint(0, 150), random.randint(0, 150)))
        
    buffered = BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return JsonResponse({'success': True, 'image': f'data:image/png;base64,{img_str}'})

# 4. 验证图片验证码
@csrf_protect
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_verify_captcha(request):
    try:
        data = json.loads(request.body)
        captcha = data.get('captcha', '').strip().lower()
        
        if not captcha:
            return JsonResponse({'error': '不能为空'}, status=400)
            
        session_captcha = request.session.get('captcha_code')
        
        if not session_captcha:
            return JsonResponse({'error': '验证码过期'}, status=400)
            
        if captcha != session_captcha:
            return JsonResponse({'error': '验证码错误'}, status=400)
            
        # Optional: Can mark captcha as verified in session to prevent bypassing
        request.session['captcha_verified'] = True
        return JsonResponse({'success': True, 'message': '验证成功'})
    except Exception as e:
        return JsonResponse({'error': '验证失败'}, status=500)

import logging

logger = logging.getLogger(__name__)

# 5. 发送邮箱验证码
@csrf_protect
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_send_email_code(request):
    try:
        data = request.data
        email = data.get('email', '').strip().lower()
        
        # Verify if captcha was passed
        if not request.session.get('captcha_verified'):
            return JsonResponse({'error': '请先完成人机验证'}, status=403)
            
        if not email:
            return JsonResponse({'error': '不能为空'}, status=400)
            
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
            return JsonResponse({'error': '格式错误'}, status=400)
            
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({'error': '邮箱已注册'}, status=400)
            
        # Get client IP for rate limiting
        # Do not blindly trust HTTP_X_FORWARDED_FOR unless you have a trusted proxy
        from django.conf import settings
        trusted_proxies = getattr(settings, 'TRUSTED_PROXIES', [])
        ip = request.META.get('REMOTE_ADDR', '')
        if ip in trusted_proxies:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0].strip()
                
        email_hash = hashlib.sha256(email.encode()).hexdigest()
        session_key = request.session.session_key
        if not session_key:
            request.session.save()
            session_key = request.session.session_key
            
        # Keys
        cooldown_key = f"register:cooldown:{email_hash}"
        email_limit_key = f"register:limit:email:{email_hash}"
        ip_limit_key = f"register:limit:ip:{ip}"
        
        # 1. 检查 60 秒冷却 (原子操作)
        if not cache.add(cooldown_key, True, timeout=60):
            return JsonResponse({'error': '发送过于频繁'}, status=429)
            
        # 2. 检查单邮箱 1 小时 5 次
        cache.add(email_limit_key, 0, timeout=3600)
        email_count = cache.get(email_limit_key, 0)
        if email_count >= 5:
            cache.delete(cooldown_key)
            return JsonResponse({'error': '请求超限'}, status=429)
            
        # 3. 检查 IP 1 小时 20 次
        cache.add(ip_limit_key, 0, timeout=3600)
        ip_count = cache.get(ip_limit_key, 0)
        if ip_count >= 20:
            cache.delete(cooldown_key)
            return JsonResponse({'error': '请求超限'}, status=429)
            
        # 生成验证码
        # 生成验证码
        code = f"{secrets.randbelow(1_000_000):06d}"
        
        # 存入 Cache (TTL 5分钟)
        otp_key = f"register:otp:{session_key}:{email_hash}"
        otp_tries_key = f"register:otp_tries:{session_key}:{email_hash}"
        
        cache.set(otp_key, make_password(code), timeout=300)
        cache.set(otp_tries_key, 0, timeout=300)
        
        # 发送邮件
        from django.core.mail import send_mail
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', getattr(settings, 'EMAIL_HOST_USER', os.getenv('EMAIL_HOST_USER')))
        
        try:
            send_mail(
                subject='【无名客】注册验证码',
                message=f'您的验证码是：{code}\n验证码5分钟内有效。',
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            # 发送失败，立刻删除验证码和冷却，避免卡死用户
            cache.delete(otp_key)
            cache.delete(otp_tries_key)
            cache.delete(cooldown_key)
            logger.exception('邮箱验证码发送失败')
            return JsonResponse({'error': '发送失败'}, status=500)
            
        # 发送成功，递增限流计数器
        cache.incr(email_limit_key)
        cache.incr(ip_limit_key)
        
        return JsonResponse({'success': True, 'message': '验证码已发送'})
    except Exception as e:
        logger.exception('邮箱验证码处理异常')
        return JsonResponse({'error': '发送失败'}, status=500)

# 6. 验证邮箱验证码
@csrf_protect
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_verify_email_code(request):
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('email_code', data.get('code', '')).strip()
        
        if not email or not code:
            return JsonResponse({'error': '不能为空'}, status=400)
            
        session_key = request.session.session_key
        if not session_key:
            return JsonResponse({'error': '验证失败'}, status=400)
            
        email_hash = hashlib.sha256(email.encode()).hexdigest()
        otp_key = f"register:otp:{session_key}:{email_hash}"
        otp_tries_key = f"register:otp_tries:{session_key}:{email_hash}"
        
        hashed_code = cache.get(otp_key)
        if not hashed_code:
            return JsonResponse({'error': '验证码过期'}, status=400)
            
        # 检查尝试次数
        tries = cache.get(otp_tries_key, 0)
        if tries >= 5:
            cache.delete(otp_key)
            cache.delete(otp_tries_key)
            return JsonResponse({'error': '验证失败次数过多'}, status=400)
            
        if not check_password(code, hashed_code):
            cache.set(otp_tries_key, tries + 1, timeout=300)
            return JsonResponse({'error': '验证码错误'}, status=400)
            
        # 验证成功，删除验证码并保存状态
        cache.delete(otp_key)
        cache.delete(otp_tries_key)
        request.session['email_verified'] = email
        return JsonResponse({'success': True, 'message': '验证成功'})
    except Exception as e:
        logger.exception('邮箱验证码校验异常')
        return JsonResponse({'error': '验证失败'}, status=500)

# 7. 最终注册
@csrf_protect
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_register_final(request):
    try:
        data = json.loads(request.body)
        invitation_code = data.get('invitation_code', '').strip()
        username = data.get('username', '').strip()
        nickname = data.get('nickname', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        captcha = data.get('captcha', '').strip().lower()
        email = data.get('email', '').strip().lower()
        email_code = data.get('email_code', '').strip()

        # 1. 验证内推码
        inv_code = InvitationCode.objects.filter(code=invitation_code, is_active=True).first()
        if not inv_code or (inv_code.expires_at and inv_code.expires_at < timezone.now()):
            return JsonResponse({'error': '内推码无效或已过期', 'field': 'invitation_code'}, status=400)

        # 2. 账户名和昵称验证
        if not re.match(r'^[A-Za-z0-9\u4e00-\u9fff]{1,15}$', username):
            return JsonResponse({'error': '格式错误', 'field': 'username'}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': '账户名已占用', 'field': 'username'}, status=400)
            
        if not re.match(r'^[A-Za-z0-9\u4e00-\u9fff]{1,15}$', nickname):
            return JsonResponse({'error': '格式错误', 'field': 'nickname'}, status=400)

        # 3. 邮箱验证
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
            return JsonResponse({'error': '格式错误', 'field': 'email'}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({'error': '邮箱已注册', 'field': 'email'}, status=400)

        # 4. 验证密码
        if len(password) < 8:
            return JsonResponse({'error': '密码过短', 'field': 'password'}, status=400)
        if len(password) > 15:
            return JsonResponse({'error': '密码过长', 'field': 'password'}, status=400)
        if ' ' in password:
            return JsonResponse({'error': '含有空格', 'field': 'password'}, status=400)
        if password != confirm_password:
            return JsonResponse({'error': '两次不一致', 'field': 'confirm_password'}, status=400)

        # 5. 人机验证
        session_captcha = request.session.get('captcha_code')
        if not session_captcha or captcha != session_captcha:
            return JsonResponse({'error': '验证码错误', 'field': 'captcha'}, status=400)

        # 6. 邮箱验证码
        if request.session.get('email_verified') != email:
            return JsonResponse({'error': '验证码错误', 'field': 'email_code'}, status=400)

        # 7 & 8. 原子操作创建用户并更新验证码状态
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            
            # 更新用户信息
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.nickname = nickname
            profile.save()
            
            # 清除 Session 中的验证状态
            if 'email_verified' in request.session:
                del request.session['email_verified']
            if 'captcha_verified' in request.session:
                del request.session['captcha_verified']
            
            return JsonResponse({'success': True, 'message': '注册成功'})
    except Exception as e:
        logger.exception('注册处理失败')
        return JsonResponse({'error': '注册失败'}, status=500)
