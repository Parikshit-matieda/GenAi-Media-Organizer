from rest_framework import serializers
from .models import Media, Tag, Room, RoomMember, Face
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['tag_name']

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['room_id', 'room_code', 'creator', 'created_at']

class FaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Face
        fields = ['id', 'media', 'person_name', 'location_data', 'created_at']

class MediaSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    detected_faces = FaceSerializer(many=True, read_only=True)
    class Meta:
        model = Media
        fields = ['media_id', 'user', 'room', 'image', 'thumbnail', 'medium', 'webp', 'upload_time', 'tags', 'detected_faces']
