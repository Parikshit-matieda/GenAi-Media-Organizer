import axios from 'axios';

export const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const roomService = {
  create: async () => {
    const response = await api.post('/rooms/');
    return response.data;
  },
  join: async (code) => {
    const response = await api.post('/join-room/', { room_code: code });
    return response.data;
  },
};

export const photoService = {
  upload: async (roomId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('room_id', roomId);
    const response = await api.post('/upload-photo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  search: async (roomId, tag = '', filters = {}) => {
    let url = `/search/?room_id=${roomId}`;
    if (tag) url += `&tag=${encodeURIComponent(tag)}`;
    
    if (filters.dateFrom) url += `&date_from=${filters.dateFrom}`;
    if (filters.dateTo) url += `&date_to=${filters.dateTo}`;
    if (filters.day) url += `&day=${filters.day}`;
    if (filters.month) url += `&month=${filters.month}`;
    if (filters.year) url += `&year=${filters.year}`;
    if (filters.type) url += `&type=${filters.type}`;
    if (filters.category) url += `&category=${filters.category}`;
    
    const response = await api.get(url);
    return response.data;
  },
  searchByFace: async (roomId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    if (roomId) formData.append('room_id', roomId);
    const response = await api.post('/face/search/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  semanticSearch: async (roomId, query, filters = {}) => {
    let url = `/semantic-search/?room_id=${roomId}&query=${encodeURIComponent(query)}`;
    
    if (filters.dateFrom) url += `&date_from=${filters.dateFrom}`;
    if (filters.dateTo) url += `&date_to=${filters.dateTo}`;
    if (filters.day) url += `&day=${filters.day}`;
    if (filters.month) url += `&month=${filters.month}`;
    if (filters.year) url += `&year=${filters.year}`;
    if (filters.type) url += `&type=${filters.type}`;
    
    const response = await api.get(url);
    return response.data;
  },
  momentSearch: async (roomId, query) => {
    const response = await api.get(`/video/moment-search/?q=${encodeURIComponent(query)}&room_id=${roomId}`);
    return response.data;
  },
};

export const faceService = {
  saveName: async (faceId, name) => {
    const response = await api.post(`/face/name/${faceId}/`, { person_name: name });
    return response.data;
  },
  renameCluster: async (roomId, oldName, newName) => {
    const response = await api.post('/face/cluster-rename/', { 
      room_id: roomId, 
      old_name: oldName, 
      new_name: newName 
    });
    return response.data;
  },
  listNames: async (roomId) => {
    const response = await api.get(`/face/names/?room_id=${roomId}`);
    return response.data;
  },
  getCropUrl: (roomId, personName) => {
    return `${API_BASE}/face/crop/?room_id=${roomId}&person_name=${encodeURIComponent(personName)}`;
  }
};

export default api;
