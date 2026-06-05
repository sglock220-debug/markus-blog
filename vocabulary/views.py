from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import VocabularyProgress
from .serializers import VocabularyProgressSerializer, VocabularySyncRequestSerializer
from django.utils import timezone
from django.db import transaction

class VocabularyProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        language = request.query_params.get('language')
        level = request.query_params.get('level')

        if not language or not level:
            return Response({"error": "language and level are required"}, status=status.HTTP_400_BAD_REQUEST)

        progress = VocabularyProgress.objects.filter(
            user=request.user,
            language=language,
            level=level
        )
        
        serializer = VocabularyProgressSerializer(progress, many=True)
        return Response({
            "language": language,
            "level": level,
            "progress": serializer.data
        })

class VocabularySyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VocabularySyncRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        changes = serializer.validated_data['changes']
        synced_results = []

        with transaction.atomic():
            for change in changes:
                language = change['language']
                level = change['level']
                word_id = change['wordId']
                learned = change['learned']
                client_updated_at = change['updatedAt']
                operation_id = change.get('operationId')

                # Try to get existing record
                obj, created = VocabularyProgress.objects.get_or_create(
                    user=request.user,
                    language=language,
                    level=level,
                    word_id=word_id,
                    defaults={
                        'learned': learned,
                        'client_updated_at': client_updated_at
                    }
                )

                if not created:
                    # If client data is newer, update server
                    if client_updated_at > obj.client_updated_at:
                        obj.learned = learned
                        obj.client_updated_at = client_updated_at
                        obj.save()
                    # If server data is newer or equal, we keep server data
                    # and return it to client later (it's already in 'obj')
                
                synced_results.append({
                    "operationId": operation_id,
                    "language": language,
                    "level": level,
                    "wordId": word_id,
                    "learned": obj.learned,
                    "updatedAt": obj.client_updated_at
                })

        return Response({"synced": synced_results})
