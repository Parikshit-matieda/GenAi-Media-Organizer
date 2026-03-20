import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, PlusCircle, ArrowRight } from 'lucide-react';

const Hero = ({ onJoin, onCreate }) => {
  const [code, setCode] = useState('');

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-gold/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 max-w-3xl"
      >
        <motion.h1 
          className="text-6xl md:text-8xl font-bold mb-6 tracking-tight"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          Smart Gallery <span className="glow-text">AI</span>
        </motion.h1>
        <p className="text-xl text-text-muted mb-12 font-medium">
          The future of event photo sharing. Fast, secure, and powered by intelligent face recognition.
        </p>

        <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
          {/* Join Room Box */}
          <div className="glass-card p-6 flex flex-col gap-4 w-full md:w-80">
            <h3 className="text-lg font-semibold text-accent-gold flex items-center gap-2">
              <Search size={20} /> Join an Event
            </h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Enter 6-digit code" 
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-input-bg border border-card-border rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-accent-gold transition-all"
              />
            </div>
            <button 
              onClick={() => onJoin(code)}
              className="premium-btn flex items-center justify-center gap-2"
              disabled={code.length !== 6}
            >
              Access Gallery <ArrowRight size={18} />
            </button>
          </div>

          <div className="text-gray-500 font-bold">OR</div>

          {/* Create Room Box */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCreate}
            className="secondary-btn flex flex-col items-center justify-center gap-2 h-[200px] w-full md:w-64 border-dashed border-2"
          >
            <PlusCircle size={40} className="text-accent-gold" />
            <span className="text-lg font-semibold">Start New Event</span>
            <span className="text-sm text-text-muted">Host your own room</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
