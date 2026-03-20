import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { API_BASE } from '../services/api';

const Highlights = ({ collections = [] }) => {
  const [activeStory, setActiveStory] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const duration = 5000; // 5 seconds per photo

  useEffect(() => {
    let interval;
    if (activeStory !== null && !isPaused) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNextPhoto();
            return 0;
          }
          return prev + (100 / (duration / 100));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [activeStory, currentPhotoIndex, isPaused]);

  const handleNextPhoto = () => {
    const currentCollection = collections[activeStory];
    if (currentPhotoIndex < currentCollection.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // End of collection - move to next story if exists, or close
      if (activeStory < collections.length - 1) {
        setActiveStory(prev => prev + 1);
        setCurrentPhotoIndex(0);
        setProgress(0);
      } else {
        closeStory();
      }
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
      setProgress(0);
    } else if (activeStory > 0) {
      setActiveStory(prev => prev - 1);
      const prevCollection = collections[activeStory - 1];
      setCurrentPhotoIndex(prevCollection.photos.length - 1);
      setProgress(0);
    }
  };

  const closeStory = () => {
    setActiveStory(null);
    setCurrentPhotoIndex(0);
    setProgress(0);
    setIsPaused(false);
  };

  if (!collections || collections.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-accent-gold" />
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest">Memories</h3>
      </div>
      
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {collections.map((collection, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative shrink-0 w-32 h-48 md:w-40 md:h-60 rounded-2xl overflow-hidden cursor-pointer shadow-lg group border-2 border-transparent hover:border-accent-gold/50 transition-all"
            onClick={() => {
              setActiveStory(idx);
              setCurrentPhotoIndex(0);
              setProgress(0);
            }}
          >
            <img 
              src={`${API_BASE.replace('/api', '')}${collection.photos[0].thumbnail || collection.photos[0].image}`} 
              alt={collection.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
              <span className="text-xs font-bold text-white leading-tight">{collection.title}</span>
              <span className="text-[10px] text-white/60 font-medium">{collection.subtitle}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {activeStory !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[150] bg-black flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg h-full max-h-[90vh] md:h-[80vh] bg-neutral-900 overflow-hidden md:rounded-[32px] shadow-2xl">
              {/* Progress Bars */}
              <div className="absolute top-4 left-4 right-4 z-50 flex gap-1">
                {collections[activeStory].photos.map((_, idx) => (
                  <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{ 
                        width: idx === currentPhotoIndex ? `${progress}%` : idx < currentPhotoIndex ? '100%' : '0%' 
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-8 left-4 right-4 z-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center border border-accent-gold/30">
                    <Sparkles size={14} className="text-accent-gold" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{collections[activeStory].title}</h4>
                    <p className="text-[10px] text-white/70">{collections[activeStory].subtitle}</p>
                  </div>
                </div>
                <button onClick={closeStory} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Main Content */}
              <div className="w-full h-full relative" onClick={() => setIsPaused(!isPaused)}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={collections[activeStory].photos[currentPhotoIndex].media_id}
                    src={`${API_BASE.replace('/api', '')}${collections[activeStory].photos[currentPhotoIndex].image}`}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.6 }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>

                {/* Ken Burns subtle zoom Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                
                {isPaused && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="p-6 bg-white/10 rounded-full text-white">
                      <Pause size={48} fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="absolute inset-y-0 left-0 w-1/4" onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }} />
              <div className="absolute inset-y-0 right-0 w-1/4" onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }} />
              
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md opacity-0 hover:opacity-100 transition-all hidden md:flex"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md opacity-0 hover:opacity-100 transition-all hidden md:flex"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Highlights;
