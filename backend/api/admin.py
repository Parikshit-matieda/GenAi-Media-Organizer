from django.contrib import admin
from .models import Media, Tag, Room, RoomMember, Face

admin.site.register(Media)
admin.site.register(Tag)
admin.site.register(Room)
admin.site.register(RoomMember)
admin.site.register(Face)
