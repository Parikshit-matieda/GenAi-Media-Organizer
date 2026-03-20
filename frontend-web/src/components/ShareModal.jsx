import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check } from 'lucide-react';

const ShareModal = ({ isOpen, onClose, currentRoom }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const roomLink = `${window.location.origin}?room=${currentRoom?.code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom?.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-card max-w-sm w-full p-8 relative overflow-hidden bg-background border-card-border"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-accent-gold/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-accent-gold/30">
                <Share2 className="text-accent-gold" size={32} />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 glow-text tracking-tight">Share Gallery</h2>
              <p className="text-sm text-text-muted mb-8">Anyone with the code or link can join this room instantly.</p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-3xl mb-8 shadow-2xl shadow-accent-gold/10 ring-8 ring-white/5">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(roomLink)}&bgcolor=ffffff&color=000000`} 
                  alt="Room QR Code"
                  className="w-48 h-48"
                />
              </div>

              <div className="w-full space-y-4">
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-left ml-2">Room Code</span>
                  <button 
                    onClick={handleCopyCode}
                    className="flex items-center justify-between w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl hover:bg-white/10 transition-all font-mono text-xl text-accent-gold tracking-widest"
                  >
                    {currentRoom?.code}
                    {copiedCode ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>

                <button 
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 w-full bg-accent-indigo hover:bg-indigo-700 text-white px-6 py-4 rounded-xl transition-all font-bold shadow-lg shadow-accent-indigo/20 text-sm"
                >
                  {copiedLink ? <><Check size={18} /> Link Copied!</> : <><Copy size={18} /> Copy Invite Link</>}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;
