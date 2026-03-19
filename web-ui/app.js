const API_BASE = 'http://localhost:8000/api';
let currentRoomId = null;
let currentRoomCode = null;

// DOM Elements
const views = {
    home: document.getElementById('home-view'),
    room: document.getElementById('room-view')
};

const modals = {
    join: document.getElementById('join-room-modal'),
    upload: document.getElementById('upload-modal'),
    faceDetail: document.getElementById('face-detail-modal'),
    faceSearch: document.getElementById('face-search-modal')
};

const loadingOverlay = document.getElementById('loading-overlay');
const gallery = document.getElementById('gallery');

// State Management
function showView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
}

function toggleModal(modalName, show = true) {
    if (show) modals[modalName].classList.add('active');
    else modals[modalName].classList.remove('active');
}

// API Calls
async function createRoom() {
    try {
        setLoading(true, 'Creating Room...');
        const response = await fetch(`${API_BASE}/rooms/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        enterRoom(data.room_id, data.room_code);
    } catch (err) {
        alert('Failed to create room: ' + err.message);
    } finally {
        setLoading(false);
    }
}

async function joinRoom(code) {
    try {
        setLoading(true, 'Joining Room...');
        const response = await fetch(`${API_BASE}/join-room/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_code: code })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        enterRoom(data.room_id, code);
        toggleModal('join', false);
    } catch (err) {
        alert('Failed to join room: ' + err.message);
    } finally {
        setLoading(false);
    }
}

async function searchByFace(file) {
    try {
        setLoading(true, 'Finding matching people in gallery...');
        const formData = new FormData();
        formData.append('image', file);
        if (currentRoomId) formData.append('room_id', currentRoomId);

        const response = await fetch(`${API_BASE}/face/search/`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || 'Search failed');
        }
        const results = await response.json();
        
        toggleModal('faceSearch', false);
        renderGallery(results);
    } catch (err) {
        alert('Face Search Error: ' + err.message);
    } finally {
        setLoading(false);
    }
}

async function nameFace(faceId, name) {
    try {
        const response = await fetch(`${API_BASE}/face/name/${faceId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_name: name })
        });
        
        if (!response.ok) throw new Error('Failed to save name');
        return await response.json();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

async function uploadPhoto(file) {
    try {
        setLoading(true, 'AI is processing your photo...');
        const formData = new FormData();
        formData.append('image', file);
        formData.append('room_id', currentRoomId);

        const response = await fetch(`${API_BASE}/upload-photo/`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        await loadPhotos(); // Refresh gallery
        toggleModal('upload', false);
    } catch (err) {
        alert('Upload Error: ' + err.message);
    } finally {
        setLoading(false);
    }
}

async function loadPhotos(tag = '') {
    try {
        let url = `${API_BASE}/search/?room_id=${currentRoomId}`;
        if (tag) url += `&tag=${tag}`;
        
        const response = await fetch(url);
        const photos = await response.json();
        
        // Double check filtering in frontend (safety)
        const roomPhotos = photos.filter(p => String(p.room).toLowerCase() === String(currentRoomId).toLowerCase());
        
        renderGallery(roomPhotos);
    } catch (err) {
        console.error('Failed to load photos:', err);
    }
}

// UI Rendering
function renderGallery(photos) {
    if (photos.length === 0) {
        gallery.innerHTML = '<div class="empty-state">No photos found.</div>';
        return;
    }

    gallery.innerHTML = photos.map(photo => `
        <div class="photo-card" onclick="openFaceDetail('${photo.media_id}')">
            <img src="http://localhost:8000${photo.image}" alt="Photo">
            <div class="photo-info">
                ${photo.tags.map(t => `<span class="tag-badge">${t.tag_name}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

async function openFaceDetail(mediaId) {
    try {
        setLoading(true, 'Loading photo details...');
        // Find the photo in our loaded list or fetch it
        const response = await fetch(`${API_BASE}/search/`); // Hack to get details for now
        const photos = await response.json();
        const photo = photos.find(p => p.media_id === mediaId);
        
        if (!photo) return;

        const modalImg = document.getElementById('face-detail-image');
        modalImg.src = `http://localhost:8000${photo.image}`;
        
        const markersContainer = document.getElementById('face-markers-container');
        const listContainer = document.getElementById('detected-faces-list');
        markersContainer.innerHTML = '';
        listContainer.innerHTML = '';

        // Wait for image to load to get dimensions for markers
        modalImg.onload = () => {
            const naturalWidth = modalImg.naturalWidth;
            const naturalHeight = modalImg.naturalHeight;
            
            photo.detected_faces.forEach(face => {
                const [top, right, bottom, left] = face.location_data;
                
                // Calculate percentages
                const topPct = (top / naturalHeight) * 100;
                const leftPct = (left / naturalWidth) * 100;
                const widthPct = ((right - left) / naturalWidth) * 100;
                const heightPct = ((bottom - top) / naturalHeight) * 100;

                const marker = document.createElement('div');
                marker.className = 'face-marker';
                marker.style.top = `${topPct}%`;
                marker.style.left = `${leftPct}%`;
                marker.style.width = `${widthPct}%`;
                marker.style.height = `${heightPct}%`;
                marker.setAttribute('data-name', face.person_name || 'Who is this?');
                markersContainer.appendChild(marker);

                const item = document.createElement('div');
                item.className = 'detected-face-item';
                item.innerHTML = `
                    <input type="text" class="name-input" placeholder="Enter name..." value="${face.person_name || ''}">
                    <button class="primary-btn save-btn">Save Name</button>
                `;
                
                item.querySelector('.save-btn').onclick = async () => {
                    const newName = item.querySelector('.name-input').value;
                    if (newName) {
                        await nameFace(face.id, newName);
                        marker.setAttribute('data-name', newName);
                        alert('Name saved!');
                    }
                };
                listContainer.appendChild(item);
            });
        };

        toggleModal('faceDetail', true);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

function enterRoom(id, code) {
    currentRoomId = id;
    currentRoomCode = code;
    document.getElementById('display-room-code').innerText = code;
    showView('room');
    loadPhotos();
}

function setLoading(active, text = '') {
    if (active) {
        loadingOverlay.classList.add('active');
        document.getElementById('loading-text').innerText = text;
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// Event Listeners
document.getElementById('btn-create-room').onclick = createRoom;
document.getElementById('btn-join-room-trigger').onclick = () => toggleModal('join');
document.getElementById('btn-back-home').onclick = () => showView('home');
document.getElementById('btn-face-search-trigger').onclick = () => toggleModal('faceSearch');

document.getElementById('btn-join-room').onclick = () => {
    const code = document.getElementById('room-code-input').value.toUpperCase();
    if (code.length === 6) joinRoom(code);
    else alert('Please enter a valid 6-character code');
};

document.getElementById('btn-upload-trigger').onclick = () => {
    document.getElementById('file-input').click();
    toggleModal('upload');
};

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('btn-upload-action');
const preview = document.getElementById('upload-preview');
const previewImg = document.getElementById('preview-image');

dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelection(file);
};

function handleFileSelection(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
        dropZone.style.display = 'none';
        uploadBtn.disabled = false;
        
        uploadBtn.onclick = () => uploadPhoto(file);
    };
    reader.readAsDataURL(file);
}

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = (e) => {
        const modal = e.target.closest('.modal');
        modal.classList.remove('active');
        // Reset upload modal if closed
        if (modal.id === 'upload-modal') {
            preview.style.display = 'none';
            dropZone.style.display = 'block';
            uploadBtn.disabled = true;
            fileInput.value = '';
        }
    };
});

document.getElementById('tag-search').oninput = (e) => {
    loadPhotos(e.target.value);
};

// Handle Drag and Drop
dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
};

dropZone.ondragleave = () => dropZone.classList.remove('dragover');

// Face Search Drag and Drop
const faceSearchDropZone = document.getElementById('face-search-drop-zone');
const faceSearchInput = document.getElementById('face-search-input');
const faceSearchBtn = document.getElementById('btn-face-search-action');
const faceSearchPreview = document.getElementById('face-search-preview');
const faceSearchPreviewImg = document.getElementById('face-search-preview-image');

faceSearchDropZone.onclick = () => faceSearchInput.click();

faceSearchInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            faceSearchPreviewImg.src = re.target.result;
            faceSearchPreview.style.display = 'block';
            faceSearchDropZone.style.display = 'none';
            faceSearchBtn.disabled = false;
            faceSearchBtn.onclick = () => searchByFace(file);
        };
        reader.readAsDataURL(file);
    }
};

dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFileSelection(file);
    }
};
