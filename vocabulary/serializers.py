from rest_framework import serializers
from .models import VocabularyProgress

class VocabularyProgressSerializer(serializers.ModelSerializer):
    wordId = serializers.IntegerField(source='word_id')
    updatedAt = serializers.DateTimeField(source='client_updated_at')

    class Meta:
        model = VocabularyProgress
        fields = ['wordId', 'learned', 'updatedAt']

class VocabularySyncItemSerializer(serializers.Serializer):
    language = serializers.CharField()
    level = serializers.CharField()
    wordId = serializers.IntegerField()
    learned = serializers.BooleanField()
    updatedAt = serializers.DateTimeField()
    operationId = serializers.CharField(required=False)

class VocabularySyncRequestSerializer(serializers.Serializer):
    changes = VocabularySyncItemSerializer(many=True)
