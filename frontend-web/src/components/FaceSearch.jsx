import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Search, CheckCircle2, Loader2 } from 'lucide-react';

const FaceSearch = ({ isOpen, onClose, onSearch }) => {
  const [mode, setMode] = useState('choose');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  React.useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setFile(null);
      setPreview(null);
      setMode('choose');
      setIsSearching(false);
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setIsCameraStarting(true);
      setMode('camera');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions.");
      setMode('choose');
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const capturedFile = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
        setMode('upload');
      }, 'image/jpeg', 0.95);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setMode('upload');
    }
  };

  const handleSearch = async () => {
    if (file && !isSearching) {
      setIsSearching(true);
      try {
        await onSearch(file);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        // Only reset if we are still open
        setIsSearching(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative glass-card w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold glow-text">Find My Photos</h2>
                <p className="text-sm text-gray-400">Upload a selfie to find all photos containing you.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {mode === 'choose' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center gap-4 py-10 bg-white/5 border-2 border-dashed border-white/20 rounded-3xl hover:bg-white/10 hover:border-accent-indigo transition-all group"
                  >
                    <div className="w-14 h-14 bg-accent-indigo/20 rounded-full flex items-center justify-center text-accent-indigo group-hover:scale-110 transition-transform">
                      <Camera size={28} />
                    </div>
                    <span className="font-semibold">Take a Selfie</span>
                  </button>

                  <button 
                    onClick={() => { fileInputRef.current?.click(); }}
                    className="flex flex-col items-center justify-center gap-4 py-10 bg-white/5 border-2 border-dashed border-white/20 rounded-3xl hover:bg-white/10 hover:border-accent-gold transition-all group"
                  >
                    <div className="w-14 h-14 bg-accent-gold/20 rounded-full flex items-center justify-center text-accent-gold group-hover:scale-110 transition-transform">
                      <Upload size={28} />
                    </div>
                    <span className="font-semibold">Upload Photo</span>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*" />
                </div>
              )}

              {mode === 'camera' && (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative w-full aspect-square max-w-sm rounded-[40px] overflow-hidden border-2 border-accent-indigo ring-8 ring-accent-indigo/10 bg-black">
                    {isCameraStarting && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="animate-spin text-accent-indigo" size={32} />
                      </div>
                    )}
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover mirror-mode"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => { stopCamera(); setMode('choose'); }}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all font-semibold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={capturePhoto}
                      disabled={isCameraStarting}
                      className="flex-[2] py-4 bg-accent-indigo hover:bg-indigo-700 text-white rounded-2xl transition-all font-bold shadow-lg shadow-accent-indigo/20 active:scale-95"
                    >
                      Capture Photo
                    </button>
                  </div>
                </div>
              )}

              {mode === 'upload' && preview && (
                <div className="space-y-6">
                  <div className="relative aspect-square w-48 mx-auto rounded-full overflow-hidden border-4 border-accent-gold ring-8 ring-accent-gold/10">
                    <img src={preview} alt="Selfie preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => { setFile(null); setPreview(null); setMode('choose'); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-accent-gold shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-300">
                      Our AI will analyze your facial features to match you in the entire gallery. Privacy is our priority.
                    </p>
                  </div>
                  <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className={`premium-btn w-full flex items-center justify-center gap-2 text-lg py-4 ${isSearching ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {isSearching ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Search size={20} />
                    )}
                    {isSearching ? 'Analyzing Features...' : 'Find My Moments'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FaceSearch;
