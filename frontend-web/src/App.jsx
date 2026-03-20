import React, { useState, useEffect, useRef } from 'react';
import Hero from './components/Hero';
import Gallery from './components/Gallery';
import Highlights from './components/Highlights';
import FaceSearch from './components/FaceSearch';
import ShareModal from './components/ShareModal';
import { API_BASE, roomService, photoService, faceService } from './services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  LogOut, 
  Filter, 
  User, 
  UserSearch, 
  Edit2, 
  Share2, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  Tag, 
  Search, 
  Sun, 
  Moon, 
  Download,
  Plus,
  Image as ImageIcon,
  ChevronRight,
  MoreVertical,
  Maximize2,
  Camera,
  Trash2,
  Settings,
  FolderOpen
} from 'lucide-react';

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
  const [semanticQuery, setSemanticQuery] = useState('');
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [isMomentSearch, setIsMomentSearch] = useState(false);
  const [momentQuery, setMomentQuery] = useState('');
  const [editingTag, setEditingTag] = useState(null); // { oldName, value }
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const videoRef = useRef(null);
  
  // Download Options State
  const [downloadType, setDownloadType] = useState('image'); // 'image' | 'pdf'
  const [downloadSize, setDownloadSize] = useState('original'); // 'thumbnail' | 'medium' | 'original'
  const [downloadFormat, setDownloadFormat] = useState('jpg'); // 'jpg' | 'png' | 'webp'
  
  // Search Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    day: '',
    month: '',
    year: '',
    type: '',
    category: ''
  });

  // Highlight Collections Logic
  const getHighlightCollections = () => {
    if (!photos || photos.length === 0) return [];
    
    const collections = [];
    
    // 1. "People Captured" Highlight
    const photoWithFaces = photos.filter(p => (p.detected_faces && p.detected_faces.length > 0) || p.person_name).slice(0, 5);
    if (photoWithFaces.length > 0) {
      collections.push({
        title: "Featured People",
        subtitle: "Meaningful Faces & Portraits",
        photos: photoWithFaces
      });
    }
    
    // 2. "Recent Documents" Highlight
    const docPhotos = photos.filter(p => 
      p.tags?.some(t => ['receipt', 'document', 'invoice', 'paper'].includes(t.tag_name.toLowerCase()))
    ).slice(0, 5);
    
    if (docPhotos.length > 0) {
      collections.push({
        title: "Scanner Highlights",
        subtitle: "Key Documents & Invoices",
        photos: docPhotos
      });
    }

    // 3. "The Best of Today"
    const today = new Date().toLocaleDateString();
    const todayPhotos = photos.filter(p => new Date(p.upload_time).toLocaleDateString() === today).slice(0, 5);
    if (todayPhotos.length > 0) {
      collections.push({
        title: "Moments from Today",
        subtitle: "Your latest experience",
        photos: todayPhotos
      });
    } else if (photos.length > 0) {
      // Fallback: Random recent highlights
      collections.push({
        title: "Gallery Highlights",
        subtitle: "A look back at your journey",
        photos: photos.slice(0, 5)
      });
    }
    
    return collections;
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    
    if (roomFromUrl && !currentRoom) {
      handleJoinRoom(roomFromUrl);
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

  const loadPhotos = async (roomId, tag = '', currentFilters = filters) => {
    if (!roomId) return;
    try {
      setLoading(true);
      const data = await photoService.search(roomId, tag, currentFilters);
      setPhotos(Array.isArray(data) ? data : []);
      
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

  const handleSemanticSearch = async (query) => {
    if (!currentRoom?.id || !query) return;
    try {
      setLoading(true);
      const data = await photoService.semanticSearch(currentRoom.id, query, filters);
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Semantic search failed:', err);
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMomentSearch = async (query) => {
    if (!currentRoom?.id || !query) return;
    try {
      setSearchTag('');
      setIsSemanticSearch(false);
      setLoading(true);
      const data = await photoService.momentSearch(currentRoom.id, query);
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Moment search failed:', err);
      alert('Video search failed');
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
        }
    }

    setUploadProgress(null);
    if (currentRoom?.id) loadPhotos(currentRoom.id);
  };

  const handleRenameCluster = async (oldName, newName) => {
    if (!newName || newName === oldName) {
      setEditingTag(null);
      return;
    }
    
    try {
      setPersonNames(prev => prev.map(n => n === oldName ? newName : n));
      if (searchTag === oldName) setSearchTag(newName);
      
      setEditingTag(null);
      await faceService.renameCluster(currentRoom?.id, oldName, newName);
      loadPhotos(currentRoom.id, newName);
    } catch (err) {
      alert('Rename failed: ' + err.message);
      loadPhotos(currentRoom.id);
    }
  };

  useEffect(() => {
    if (selectedPhoto?.media_type === 'video' && videoRef.current && selectedPhoto.moment_timestamp !== undefined) {
      videoRef.current.currentTime = selectedPhoto.moment_timestamp;
    }
  }, [selectedPhoto]);

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
            <nav className="sticky top-0 z-40 bg-glass-bg backdrop-blur-xl border-b border-card-border px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text">Gallery</h2>
                </div>
                
                {/* Desktop Search */}
                <div className="flex-1 max-w-2xl mx-12 hidden md:block">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-accent-indigo/5 group-hover:bg-accent-indigo/10 transition-all rounded-2xl blur-xl opacity-0 group-hover:opacity-100" />
                    <div className="relative">
                      {loading && (isSemanticSearch || isMomentSearch || searchTag) ? (
                        <Loader2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-indigo animate-spin" />
                      ) : (
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-accent-indigo" />
                      )}
                      <input 
                        type="text" 
                        placeholder={isMomentSearch ? "Describe a video moment: 'a person dancing'..." : isSemanticSearch ? "Ask AI: 'photos of my trip'..." : "Search tags, faces..."}
                        value={isMomentSearch ? momentQuery : isSemanticSearch ? semanticQuery : searchTag}
                        onChange={(e) => {
                          if (isMomentSearch) {
                            setMomentQuery(e.target.value);
                          } else if (isSemanticSearch) {
                            setSemanticQuery(e.target.value);
                          } else {
                            setSearchTag(e.target.value);
                            loadPhotos(currentRoom.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (isMomentSearch) handleMomentSearch(momentQuery);
                            else if (isSemanticSearch) handleSemanticSearch(semanticQuery);
                          }
                        }}
                        className="w-full bg-input-bg border-none ring-1 ring-card-border rounded-2xl pl-12 pr-40 py-3.5 focus:outline-none focus:ring-2 focus:ring-accent-indigo transition-all text-sm font-medium text-foreground google-search-shadow group-hover:shadow-md"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <button 
                          onClick={() => {
                            setIsMomentSearch(!isMomentSearch);
                            setIsSemanticSearch(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider ${isMomentSearch ? 'bg-accent-gold text-black shadow-lg' : 'bg-white/5 text-text-muted hover:text-foreground'}`}
                        >
                          Video AI
                        </button>
                        <button 
                          onClick={() => {
                            setIsSemanticSearch(!isSemanticSearch);
                            setIsMomentSearch(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider ${isSemanticSearch ? 'bg-accent-indigo text-white shadow-lg' : 'bg-white/5 text-text-muted hover:text-foreground'}`}
                        >
                          {isSemanticSearch ? 'AI Active' : 'Semantic'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  <button 
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      if (isSelectMode) setSelectedPhotos([]);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-semibold ${isSelectMode ? 'bg-accent-indigo text-white border-accent-indigo shadow-lg shadow-accent-indigo/20' : 'bg-card-bg hover:bg-white/10 text-text-muted border-card-border'}`}
                  >
                    <Check size={18} /> <span className="hidden md:inline">{isSelectMode ? 'Cancel' : 'Select'}</span>
                  </button>

                  <button 
                    onClick={() => setIsFaceSearchOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-card-bg hover:bg-accent-gold/20 text-accent-gold rounded-full border border-accent-gold/20 transition-all text-sm font-semibold"
                  >
                    <UserSearch size={18} /> <span className="hidden md:inline">Find My Photos</span>
                  </button>
                  
                  <label className="flex items-center gap-2 px-4 py-2 bg-accent-indigo hover:bg-indigo-700 text-white rounded-full transition-all text-sm font-semibold cursor-pointer">
                    <Upload size={18} /> <span className="hidden md:inline">Upload</span>
                    <input type="file" multiple hidden onChange={handleFileUpload} accept="image/*,video/*" />
                  </label>

                  <button onClick={() => setIsShareModalOpen(true)} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all">
                    <Share2 size={20} />
                  </button>

                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-white/10 text-gray-400 hover:text-accent-gold rounded-full transition-all">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                  </button>

                  <button onClick={() => setView('home')} className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-all">
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
                    <div className="w-full bg-card-bg rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        className="bg-accent-indigo h-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Filter Popover Anchor */}
              <div className="max-w-7xl mx-auto mt-4 flex items-center justify-between gap-4">
                  <div className="flex-1 overflow-x-auto no-scrollbar py-2">
                     <div className="flex gap-4 items-center">
                        {/* All Photos "Folder" */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button 
                            onClick={() => { setSearchTag(''); loadPhotos(currentRoom.id, ''); }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${!searchTag ? 'bg-accent-indigo border-accent-indigo ring-4 ring-accent-indigo/20' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                          >
                            <Filter size={20} className={!searchTag ? 'text-white' : 'text-gray-400'} />
                          </button>
                          <span className={`text-[9px] font-bold uppercase tracking-tight ${!searchTag ? 'text-white' : 'text-text-muted'}`}>All</span>
                        </div>

                        {/* Person/Entity Folders */}
                        {Array.from(new Set((Array.isArray(photos) ? photos : []).flatMap(p => [
                          ...(p.tags ? p.tags.map(t => t.tag_name) : []),
                          ...(p.detected_faces ? p.detected_faces.map(f => f.person_name) : [])
                        ])))
                        .filter(tag => {
                          if (!tag) return false;
                          const noiseTags = ['vase', 'chair', 'table', 'bottle', 'pottedplant', 'tvmonitor', 'laptop', 'remote', 'cell phone', 'microwave', 'sink', 'book', 'clock', 'scissors'];
                          return !noiseTags.includes(tag.toLowerCase());
                        })
                        .sort((a, b) => {
                          const isAPerson = personNames.includes(a);
                          const isBPerson = personNames.includes(b);
                          if (isAPerson && !isBPerson) return -1;
                          if (!isAPerson && isBPerson) return 1;
                          return a.localeCompare(b);
                        })
                        .slice(0, 15)
                        .map(tag => (
                          <div key={tag} className="flex flex-col items-center gap-1 shrink-0 group/chip">
                            <button 
                              onClick={() => { setSearchTag(tag); loadPhotos(currentRoom.id, tag); }}
                              className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${searchTag === tag ? 'border-accent-gold ring-4 ring-accent-gold/20' : 'border-card-border hover:border-accent-gold/40 bg-card-bg'}`}
                            >
                              <img 
                                src={faceService.getCropUrl(currentRoom?.id, tag)} 
                                alt={tag}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-full h-full items-center justify-center text-text-muted">
                                <User size={20} />
                              </div>
                            </button>
                            <span className={`text-[9px] font-bold uppercase tracking-tight truncate w-14 text-center ${searchTag === tag ? 'text-accent-gold' : 'text-text-muted'}`}>
                              {tag}
                            </span>
                          </div>
                        ))}
                     </div>
                  </div>

                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-3 rounded-2xl border transition-all shrink-0 ${showFilters || Object.values(filters).some(v => v) ? 'bg-accent-gold border-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'bg-card-bg border-card-border text-text-muted hover:border-accent-indigo'}`}
                  >
                    <Filter size={20} />
                  </button>
              </div>

              {/* Advanced Filter Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="max-w-7xl mx-auto mt-4 bg-card-bg/50 border border-card-border rounded-2xl p-6 overflow-hidden backdrop-blur-md"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Date Range</label>
                        <div className="flex gap-2">
                          <input type="date" value={filters.dateFrom} onChange={e => { const f = {...filters, dateFrom: e.target.value}; setFilters(f); loadPhotos(currentRoom.id, searchTag, f); }} className="w-full bg-input-bg border border-card-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-accent-indigo outline-none" />
                          <input type="date" value={filters.dateTo} onChange={e => { const f = {...filters, dateTo: e.target.value}; setFilters(f); loadPhotos(currentRoom.id, searchTag, f); }} className="w-full bg-input-bg border border-card-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-accent-indigo outline-none" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Year/Month</label>
                        <div className="flex gap-2">
                          <select value={filters.year} onChange={e => { const f = {...filters, year: e.target.value}; setFilters(f); loadPhotos(currentRoom.id, searchTag, f); }} className="bg-input-bg border border-card-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent-indigo">
                            <option value="">Year</option>
                            {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <select value={filters.month} onChange={e => { const f = {...filters, month: e.target.value}; setFilters(f); loadPhotos(currentRoom.id, searchTag, f); }} className="bg-input-bg border border-card-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent-indigo">
                            <option value="">Month</option>
                            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">File Type</label>
                        <select value={filters.type} onChange={e => { const f = {...filters, type: e.target.value}; setFilters(f); loadPhotos(currentRoom.id, searchTag, f); }} className="w-full bg-input-bg border border-card-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent-indigo">
                          <option value="">Any</option>
                          <option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button onClick={() => { const r = {dateFrom:'',dateTo:'',day:'',month:'',year:'',type:'',category:''}; setFilters(r); loadPhotos(currentRoom.id, '', r); }} className="text-xs text-accent-gold hover:underline font-bold">Clear All</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
              {/* Highlights Section */}
              {!searchTag && !semanticQuery && !showFilters && (
                <section>
                  <Highlights collections={getHighlightCollections()} />
                </section>
              )}

              {/* Gallery Section */}
              <section>
                <Gallery 
                  photos={photos} 
                  loading={loading} 
                  isSelectMode={isSelectMode}
                  selectedPhotos={selectedPhotos}
                  onPhotoClick={p => isSelectMode ? setSelectedPhotos(prev => prev.includes(p.media_id) ? prev.filter(x => x !== p.media_id) : [...prev, p.media_id]) : setSelectedPhoto(p)}
                />
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays & Modals */}
      <AnimatePresence>
        {isSelectMode && selectedPhotos.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-accent-indigo text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/20 backdrop-blur-md">
            <span className="text-sm font-bold">{selectedPhotos.length} selected</span>
            <button onClick={async () => {
              const res = await fetch(`${API_BASE}/bulk-download/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ media_ids: selectedPhotos }) });
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `gallery_${Date.now()}.zip`; a.click();
              setIsSelectMode(false); setSelectedPhotos([]);
            }} className="px-5 py-2 bg-white text-accent-indigo rounded-xl text-sm font-bold shadow-lg">Download ZIP</button>
            <button onClick={() => { setIsSelectMode(false); setSelectedPhotos([]); }} className="text-xs font-bold opacity-80 hover:opacity-100">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <FaceSearch isOpen={isFaceSearchOpen} onClose={() => setIsFaceSearchOpen(false)} onSearch={handleFaceSearch} />

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative max-w-5xl w-full h-[85vh] flex flex-col md:flex-row bg-glass-bg rounded-[40px] border border-card-border overflow-hidden shadow-2xl">
              <div className="flex-1 bg-black/5 flex items-center justify-center relative min-h-[40vh]">
                {selectedPhoto.media_type === 'video' ? (
                  <video 
                    ref={videoRef}
                    src={`${API_BASE.replace('/api', '')}${selectedPhoto.image}`} 
                    className="max-w-full max-h-full" 
                    controls 
                    autoPlay
                  />
                ) : (
                  <img src={`${API_BASE.replace('/api', '')}${selectedPhoto.webp || selectedPhoto.image}`} className="max-w-full max-h-full object-contain" />
                )}
                <button onClick={() => setSelectedPhoto(null)} className="absolute top-6 left-6 p-3 bg-black/50 text-white rounded-full backdrop-blur-md"><X size={24} /></button>
              </div>
              <div className="w-full md:w-80 p-8 flex flex-col gap-6 bg-black/20 border-l border-white/10">
                <h3 className="text-2xl font-bold">Details</h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">{selectedPhoto.tags?.map((t, i) => <span key={i} className="px-3 py-1 bg-white/5 rounded-full text-xs flex items-center gap-1"><Tag size={12} /> {t.tag_name}</span>)}</div>
                  <button onClick={() => window.open(`${API_BASE}/download-single/${selectedPhoto.media_id}/?type=${downloadType}&size=${downloadSize}&format=${downloadFormat}`, '_blank')} className="w-full py-4 bg-accent-gold text-black rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"><Download size={18} /> Download</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} currentRoom={currentRoom} />
      
      {loading && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="glass-card p-8 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-accent-gold" size={48} />
              <p className="font-bold text-accent-gold">AI Processing...</p>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;
