from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PhotoUploadView, SearchView, RoomViewSet, FaceNameView, FaceSearchView, AIHealthCheckView, ClusterRenameView, FaceCropView, FaceNamesView

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')

urlpatterns = [
    path('', include(router.urls)),
    path('upload-photo/', PhotoUploadView.as_view(), name='upload-photo'),
    path('search/', SearchView.as_view(), name='search'),
    path('join-room/', RoomViewSet.as_view({'post': 'join_room'}), name='join-room'),
    path('face/name/<int:face_id>/', FaceNameView.as_view(), name='name-face'),
    path('face/search/', FaceSearchView.as_view(), name='face-search'),
    path('face/cluster-rename/', ClusterRenameView.as_view(), name='cluster-rename'),
    path('face/crop/', FaceCropView.as_view(), name='face-crop'),
    path('face/names/', FaceNamesView.as_view(), name='face-names'),
    path('ai-health/', AIHealthCheckView.as_view(), name='ai-health'),
]
