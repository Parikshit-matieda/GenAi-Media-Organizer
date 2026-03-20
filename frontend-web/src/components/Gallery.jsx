import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Tag, Download, Zap, Check, Circle, Play } from 'lucide-react';
import { API_BASE } from '../services/api';

const Gallery = ({ photos, loading, onPhotoClick, isSelectMode, selectedPhotos = [] }) => {
  const groupPhotosByDate = (photos) => {
    const groups = {};
    photos.forEach(photo => {
      const date = new Date(photo.upload_time);
      const dateKey = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Special labels for Today/Yesterday
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      let displayDate = dateKey;
      if (dateKey === today) displayDate = "Today";
      else if (dateKey === yesterday) displayDate = "Yesterday";

      if (!groups[displayDate]) groups[displayDate] = [];
      groups[displayDate].push(photo);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-card-bg rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card-bg rounded-3xl border border-dashed border-card-border">
        <p className="text-text-muted text-lg font-medium">No photos found in this gallery.</p>
      </div>
    );
  }

    const groupedPhotos = groupPhotosByDate(photos);

    return (
      <div className="space-y-12 pb-20">
        <AnimatePresence>
          {Object.entries(groupedPhotos).map(([date, groupPhotos]) => (
            <div key={date} className="space-y-4">
              <div className="sticky top-[100px] z-30 bg-background/80 backdrop-blur-md py-3 px-4 -mx-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground/80 tracking-tight uppercase">
                  {date}
                </h3>
                <span className="text-[10px] font-bold text-text-muted">
                  {groupPhotos.length} {groupPhotos.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                {groupPhotos.map((photo, index) => {
                  const isSelected = selectedPhotos.includes(photo.media_id);
                  return (
                    <motion.div
                      key={photo.media_id || index}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`group relative overflow-hidden cursor-pointer selection-none transition-all rounded-lg ${isSelected ? 'ring-4 ring-accent-indigo ring-offset-2 ring-offset-background z-10' : 'hover:shadow-xl'}`}
                      onClick={() => onPhotoClick(photo)}
                    >
                      <img 
                        src={photo.thumbnail ? `${API_BASE.replace('/api', '')}${photo.thumbnail}` : `${API_BASE.replace('/api', '')}${photo.image}`} 
                        alt="Event moment"
                        className={`w-full h-full object-cover aspect-square transition-transform duration-500 scale-[1.01] ${isSelected ? 'opacity-80' : 'group-hover:scale-105'}`}
                        loading="lazy"
                      />
                      
                      {/* Selection Checkmark */}
                      {isSelectMode && (
                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-20 ${isSelected ? 'bg-accent-indigo border-accent-indigo shadow-lg scale-110' : 'bg-black/20 border-white/50 backdrop-blur-md'}`}>
                          {isSelected ? <Check size={14} className="text-white" /> : <Circle size={14} className="text-white/30" />}
                        </div>
                      )}

                      {/* Video Play Icon Overlay */}
                      {photo.media_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 group-hover:scale-110 transition-transform">
                            <Play size={20} fill="currentColor" />
                          </div>
                        </div>
                      )}

                      {/* Moment Timestamp Badge */}
                      {photo.moment_timestamp !== undefined && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-accent-indigo/90 backdrop-blur-sm text-white text-[9px] font-bold rounded-md shadow-lg flex items-center gap-1 z-10">
                          <Zap size={8} fill="currentColor" /> 
                          {Math.floor(photo.moment_timestamp / 60)}:{String(Math.floor(photo.moment_timestamp % 60)).padStart(2, '0')}
                        </div>
                      )}

                      {/* Similarity/Relevance Badge */}
                      {(photo.similarity !== undefined || photo.relevance !== undefined) && (
                        <div className={`absolute top-2 left-2 px-2 py-0.5 bg-accent-gold/90 backdrop-blur-sm text-black text-[9px] font-bold rounded-md shadow-lg flex items-center gap-1 z-10`}>
                          <Zap size={8} fill="currentColor" /> 
                          {photo.similarity !== undefined 
                            ? `${Math.round(Math.min(99, (photo.similarity * 250)))}%`
                            : `S:${photo.relevance}`
                          }
                        </div>
                      )}
                      
                      {/* Hover Overlay */}
                      {!isSelectMode && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {photo.tags?.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-[8px] px-1.5 py-0.5 bg-accent-indigo/80 text-white rounded-md font-bold uppercase tracking-tighter">
                                {tag.tag_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </AnimatePresence>
      </div>
    );
};

export default Gallery;
