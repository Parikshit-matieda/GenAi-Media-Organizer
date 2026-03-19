import axios from 'axios';

const API_BASE_URL = 'http://10.0.2.2:8000/api'; // Standard Android emulator localhost

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

export const uploadPhoto = async (imageUri, roomId = null) => {
    const formData = new FormData();
    formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'upload.jpg',
    });
    if (roomId) formData.append('room_id', roomId);

    try {
        const response = await api.post('/upload-photo/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
};

export const searchPhotos = async (query, type = 'tag') => {
    try {
        const params = type === 'tag' ? { tag: query } : { text: query };
        const response = await api.get('/search/', { params });
        return response.data;
    } catch (error) {
        console.error('Search Error:', error);
        throw error;
    }
};

export const createRoom = async () => {
    const response = await api.post('/rooms/');
    return response.data;
};

export const joinRoom = async (roomCode) => {
    const response = await api.post('/join-room/', { room_code: roomCode });
    return response.data;
};

export default api;
