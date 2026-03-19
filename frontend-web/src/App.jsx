import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import Gallery from './components/Gallery';
import FaceSearch from './components/FaceSearch';
import { roomService, photoService, faceService } from './services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, LogOut, Filter, User, UserSearch, Edit2, Share2, Copy, Check, X, Loader2, Tag } from 'lucide-react';

function App() {
  const [view, setView] = useState('home'); // 'home' or 'room'
  const [currentRoom, setCurrentRoom] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [personNames, setPersonNames] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total }
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [searchTag, setSearchTag] = useState('');

  useEffect(() => {
    // Check for room in URL (from QR code scan or invite link)
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    
    if (roomFromUrl && !currentRoom) {
      handleJoinRoom(roomFromUrl);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      const data = await roomService.create();
      enterRoom(data.room_id, data.room_code);
    } catch (err) {
      alert('Failed to create room: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (code) => {
    try {
      setLoading(true);
      const data = await roomService.join(code);
      enterRoom(data.room_id, code);
    } catch (err) {
      alert('Invalid room code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const enterRoom = (id, code) => {
    setCurrentRoom({ id, code });
    setView('room');
    loadPhotos(id);
  };

  const loadPhotos = async (roomId, tag = '') => {
    if (!roomId) return;
    try {
      setLoading(true);
      const data = await photoService.search(roomId, tag);
      setPhotos(Array.isArray(data) ? data : []);
      
      // Also refresh person names whenever we reload photos/room
      const namesData = await faceService.listNames(roomId);
      setPersonNames(namesData?.person_names || []);
    } catch (err) {
      console.error('Error loading photos:', err);
      setPhotos([]);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceSearch = async (file) => {
    try {
      setSearchTag('');
      setLoading(true);
      const results = await photoService.searchByFace(currentRoom?.id, file);
      if (Array.isArray(results)) {
        setPhotos(results);
        setIsFaceSearchOpen(false);
      } else {
        console.warn("Face search returned non-array result:", results);
        alert("No clear results found. Try another photo.");
      }
    } catch (err) {
      alert('Face search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    setUploadProgress({ current: 0, total: files.length });
    
    for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        try {
            await photoService.upload(currentRoom?.id, files[i]);
        } catch (err) {
            console.error(`Failed to upload file ${i + 1}`, err);
            alert(`Failed to upload ${files[i].name}`);
        }
    }

    setUploadProgress(null);
    if (currentRoom?.id) loadPhotos(currentRoom.id);
  };

  const handleRenameCluster = async (oldName) => {
    const newName = window.prompt(`Rename "${oldName}" to:`, oldName);
    if (newName && newName !== oldName) {
      try {
        setLoading(true);
        await faceService.renameCluster(currentRoom?.id, oldName, newName);
        setSearchTag(newName);
        loadPhotos(currentRoom.id, newName);
      } catch (err) {
        alert('Rename failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-indigo/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-gold/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Hero onJoin={handleJoinRoom} onCreate={handleCreateRoom} />
          </motion.div>
        ) : (
          <motion.div
            key="room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            {/* Nav */}
            <nav className="sticky top-0 z-40 bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold glow-text">Room: {currentRoom?.code}</h2>
                </div>
                
                <div className="flex items-center gap-2 md:gap-4">
                  <button 
                    onClick={() => setIsFaceSearchOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-accent-gold/20 text-accent-gold rounded-full border border-accent-gold/20 transition-all text-sm font-semibold"
                  >
                    <UserSearch size={18} /> <span className="hidden md:inline">Find My Photos</span>
                  </button>
                  
                  <label className="flex items-center gap-2 px-4 py-2 bg-accent-indigo hover:bg-indigo-700 text-white rounded-full transition-all text-sm font-semibold cursor-pointer">
                    <Upload size={18} /> <span className="hidden md:inline">Upload</span>
                    <input type="file" multiple hidden onChange={handleFileUpload} accept="image/*" />
                  </label>

                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all"
                    title="Share Room"
                  >
                    <Share2 size={20} />
                  </button>

                  <button 
                    onClick={() => setView('home')}
                    className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-all"
                    title="Leave Room"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>

              {uploadProgress && (
                <div className="max-w-7xl mx-auto mt-4 px-2">
                  <div className="bg-accent-indigo/10 border border-accent-indigo/20 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-bold text-accent-indigo uppercase tracking-wider">
                      <span>Uploading Photos...</span>
                      <span>{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        className="bg-accent-indigo h-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tag Bar */}
              <div className="max-w-7xl mx-auto mt-4 space-y-4">
                <div className="relative flex-1">
                  <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search by tags (e.g. cake, rings, smile)..."
                    value={searchTag}
                    onChange={(e) => {
                      setSearchTag(e.target.value);
                      loadPhotos(currentRoom.id, e.target.value);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 focus:outline-none focus:border-accent-indigo transition-all text-sm"
                  />
                </div>

                {/* Smart Folders Section (Google Photos Style) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                       Smart Folders
                    </h3>
                    {!searchTag && <span className="text-[10px] text-accent-gold animate-pulse">Auto-organized by AI</span>}
                  </div>
                  
                  <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                    {/* All Photos "Folder" */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <button 
                        onClick={() => { setSearchTag(''); loadPhotos(currentRoom.id, ''); }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${!searchTag ? 'bg-accent-indigo border-accent-indigo ring-4 ring-accent-indigo/20 scale-110' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                      >
                        <Filter size={24} className={!searchTag ? 'text-white' : 'text-gray-400'} />
                      </button>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${!searchTag ? 'text-white' : 'text-gray-500'}`}>
                        All
                      </span>
                    </div>

                    {/* Person/Entity Folders */}
                    {Array.from(new Set((Array.isArray(photos) ? photos : []).flatMap(p => p.tags ? p.tags.map(t => t.tag_name) : [])))
                    .filter(tag => tag && (tag.startsWith('Person') || personNames.includes(tag) || ['dog', 'cat', 'cake'].includes(tag.toLowerCase())))
                      .sort((a, b) => {
                        // People first
                        if (a.startsWith('Person') && !b.startsWith('Person')) return -1;
                        if (!a.startsWith('Person') && b.startsWith('Person')) return 1;
                        return a.localeCompare(b);
                      })
                      .map(tag => (
                        <div key={tag} className="flex flex-col items-center gap-2 shrink-0 group/chip">
                          <button 
                            onClick={() => { setSearchTag(tag); loadPhotos(currentRoom.id, tag); }}
                            className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95 ${searchTag === tag ? 'border-accent-gold ring-4 ring-accent-gold/20 scale-110' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                          >
                            <img 
                              src={faceService.getCropUrl(currentRoom?.id, tag)} 
                              alt={tag}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                // Transparent fallback if no face crop available
                                e.target.style.display = 'none';
                                e.target.nextSibling.classList.remove('hidden');
                                e.target.nextSibling.classList.add('flex');
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center text-gray-500">
                              <User size={24} />
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap ${searchTag === tag ? 'text-accent-gold' : 'text-gray-500'}`}>
                              {tag.length > 10 ? tag.substring(0, 8) + '..' : tag}
                            </span>
                            {tag.startsWith('Person') && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRenameCluster(tag); }}
                                className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-accent-gold transition-colors opacity-0 group-hover/chip:opacity-100"
                                title="Rename"
                              >
                                <Edit2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </nav>

            {/* Gallery Content */}
            <main className="max-w-7xl mx-auto py-8">
              <Gallery 
                photos={photos} 
                loading={loading} 
                onPhotoClick={(photo) => setSelectedPhoto(photo)} 
              />
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <FaceSearch 
        isOpen={isFaceSearchOpen} 
        onClose={() => setIsFaceSearchOpen(false)} 
        onSearch={handleFaceSearch} 
      />

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-5xl w-full h-full flex flex-col md:flex-row gap-6 bg-secondary/40 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl"
            >
              {/* Image Section */}
              <div className="flex-1 bg-black/40 flex items-center justify-center relative group min-h-[50vh]">
                <img 
                  src={`http://localhost:8000${selectedPhoto.webp || selectedPhoto.medium || selectedPhoto.image}`} 
                  alt="Detail" 
                  className="max-w-full max-h-full object-contain"
                />
                
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-6 left-6 p-3 bg-black/50 hover:bg-white/10 text-white rounded-full transition-all backdrop-blur-md"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Info Section */}
              <div className="w-full md:w-80 p-8 flex flex-col gap-6 border-l border-white/10 bg-black/20 backdrop-blur-md">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold glow-text">Photo Details</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                    Captured on {new Date(selectedPhoto.upload_time).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Labels</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPhoto.tags?.map((t, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-2">
                         <Tag size={12} className="text-accent-gold" /> {t.tag_name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto space-y-4 pt-6 border-t border-white/10">
                  <a 
                    href={`http://localhost:8000${selectedPhoto.image}`} 
                    download 
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-accent-gold hover:bg-yellow-600 text-black px-6 py-4 rounded-2xl transition-all font-bold shadow-lg shadow-accent-gold/20"
                  >
                     Download Original
                  </a>
                  <p className="text-center text-[10px] text-gray-500 italic">
                    Resolution: High Quality Uncompressed
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card max-w-sm w-full p-8 relative overflow-hidden"
            >
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-accent-gold/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-accent-gold/30">
                  <Share2 className="text-accent-gold" size={32} />
                </div>
                
                <h2 className="text-2xl font-bold mb-2 glow-text">Share Gallery</h2>
                <p className="text-sm text-gray-400 mb-8">Scan to join the room instantly</p>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-3xl mb-8 shadow-2xl shadow-accent-gold/10 ring-8 ring-white/5">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '?room=' + currentRoom?.code)}&bgcolor=ffffff&color=000000`} 
                    alt="Room QR Code"
                    className="w-48 h-48"
                  />
                </div>

                <div className="w-full space-y-3">
                  <div className="flex flex-col gap-1 w-full">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left ml-2">Room Code</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentRoom?.code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex items-center justify-between w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl hover:bg-white/10 transition-all font-mono text-xl text-accent-gold tracking-widest"
                    >
                      {currentRoom?.code}
                      {copiedCode ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}?room=${currentRoom?.code}`;
                      navigator.clipboard.writeText(link);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-accent-indigo hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-all font-semibold shadow-lg shadow-accent-indigo/20"
                  >
                    {copiedLink ? <><Check size={18} /> Link Copied!</> : <><Copy size={18} /> Copy Invite Link</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="glass-card p-8 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-accent-gold" size={48} />
              <p className="font-bold text-accent-gold">Processing with AI...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
