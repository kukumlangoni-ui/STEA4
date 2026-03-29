import React from 'react';
import { motion } from 'motion/react';
import { Inbox, ArrowRight } from 'lucide-react';

export default function EmptyState({ 
  title = "Hakuna maudhui bado", 
  message = "Tafadhali rudi baadaye au angalia vipengele vingine.", 
  icon: Icon = Inbox,
  actionText,
  onAction,
  compact = false
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16 px-6'} w-full border border-white/5 rounded-[32px] bg-white/[0.02] backdrop-blur-sm`}
    >
      <div className={`mb-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 ${compact ? 'scale-75' : ''}`}>
        <Icon size={compact ? 32 : 48} className="text-white/20" />
      </div>
      
      <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-white mb-2 tracking-tight`}>
        {title}
      </h3>
      
      <p className={`text-white/40 max-w-md ${compact ? 'text-xs' : 'text-sm'} leading-relaxed mb-6`}>
        {message}
      </p>
      
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold transition-all group"
        >
          {actionText}
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </motion.div>
  );
}
