import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Tag, Download } from 'lucide-react';

const Gallery = ({ photos, loading, onPhotoClick }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
        <p className="text-gray-500 text-lg">No photos found in this gallery.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      <AnimatePresence>
        {photos.map((photo, index) => (
          <motion.div
            key={photo.media_id || index}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -5 }}
            className="group relative glass-card overflow-hidden cursor-pointer"
            onClick={() => onPhotoClick(photo)}
          >
            <img 
              src={photo.thumbnail ? `http://localhost:8000${photo.thumbnail}` : `http://localhost:8000${photo.image}`} 
              alt="Event moment"
              className="w-full h-full object-cover aspect-[3/4] transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <a 
                href={`http://localhost:8000${photo.image}`} 
                download 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-accent-gold text-black rounded-full transition-all duration-300 backdrop-blur-md hover:scale-110 shadow-lg"
                title="Download Original"
              >
                <Download size={16} />
              </a>

              <div className="flex flex-wrap gap-2 mb-2">
                {photo.tags?.map((tag, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-accent-indigo text-white rounded-full flex items-center gap-1">
                    <Tag size={10} /> {tag.tag_name}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">View Details</span>
                <Maximize2 size={16} className="text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
