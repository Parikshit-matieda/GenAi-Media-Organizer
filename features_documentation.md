# GenAi-Media-Organizer: Feature Documentation

This document outlines the core features and technical capabilities currently implemented in the **Smart Gallery AI** project.

### 1. Event Management System
- **Create Events**: Users can start a new event instantly, generating a unique 6-digit "Room Code".
- **Join Events**: Guests can access a specific gallery by entering the event code on the landing page.
- **Room-Based Isolation**: Photos and face clusters are isolated per event room for privacy and organization.

### 2. Intelligent AI Gallery
- **Optimized Media Delivery**: Automatically generates three versions of every upload:
  - **Thumbnails (300px)**: For fast grid loading.
  - **Medium (1200px)**: For previewing.
  - **WebP**: Highly compressed modern format for minimal data usage.
- **Smart Tagging**: Automatic AI processing to identify and tag objects/scenes in images.
- **Real-time Search**: Search functionality by tags, text, or detected people.

### 3. Advanced Face Recognition
- **Face Clustering**: Automatically detects and groups faces into "Persons" within a room.
- **"Find My Photos" Feature**:
  - **Camera Capture**: Users can take a live selfie directly from the browser.
  - **File Upload**: Users can upload an existing photo of themselves.
  - **AI Matching**: Compares the user's face against the library using 128-dimensional embeddings to find all matching photos.
- **Person Management**:
  - **Auto-Naming**: Initially names people as "Person 1", "Person 2", etc.
  - **Rename Clusters**: Admin/Users can rename a person, which updates all their tags and folders globally in that room.
  - **Face Avatars**: Cropped face previews for each identified person in the gallery.

### 4. UI/UX Excellence
- **Premium Aesthetics**: Dark-themed, glassmorphic design featuring vibrant accents (Gold/Indigo).
- **Responsive Layout**: Fully functional on mobile and desktop devices.
- **Micro-Animations**: Powered by `framer-motion` for smooth transitions and interactive states.
- **Iconography**: Clean and modern icons provided by `lucide-react`.

### 5. Technical Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion.
- **Backend**: Django, Django REST Framework.
- **AI Libraries**: `face_recognition`, `dlib`, `OpenCV`, `Pillow`.
- **Database**: SQLite (Development) with JSON support for AI embeddings.
