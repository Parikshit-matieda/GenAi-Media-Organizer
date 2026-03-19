from django.db import models
from django.contrib.auth.models import User
import uuid

class Room(models.Model):
    room_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_code = models.CharField(max_length=10, unique=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rooms', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.room_code

class RoomMember(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='joined_rooms')

    class Meta:
        unique_together = ('room', 'user')

class Tag(models.Model):
    tag_name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.tag_name

class Media(models.Model):
    media_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='media_files', null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='media_files')
    image = models.ImageField(upload_to='photos/%Y/%m/%d/')
    thumbnail = models.ImageField(upload_to='thumbnails/%Y/%m/%d/', null=True, blank=True)
    medium = models.ImageField(upload_to='medium/%Y/%m/%d/', null=True, blank=True)
    webp = models.ImageField(upload_to='webp/%Y/%m/%d/', null=True, blank=True)
    upload_time = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag, related_name='media_files')

    def __str__(self):
        return f"Media {self.media_id} by {self.user.username if self.user else 'Unknown'}"

class Face(models.Model):
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='detected_faces')
    embedding = models.JSONField() # Stores 128-d face embedding
    person_name = models.CharField(max_length=100, null=True, blank=True)
    location_data = models.JSONField(null=True, blank=True) # Bounding box [top, right, bottom, left]
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Face {self.id} for {self.person_name or 'Unknown'}"
