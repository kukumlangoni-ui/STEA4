import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import PosterStudio from './PosterStudio.jsx';

const STEA_GOLD = "#F5A623";

const SocialPoster = ({ content, type }) => {
  const [copied, setCopied] = useState({ ig: false, wa: false });
  const [showStudio, setShowStudio] = useState(false);

  const getInstagramCaption = () => {
    const title = content.title || content.name;
    const desc = content.summary || content.description || "";
    return `🚀 ${title}\n\n${desc}\n\nSTEA - SwahiliTech Elite Academy\nJifunze Teknolojia kwa Kiswahili.\n\n🔗 Link kwenye bio!\n\n#STEA #SwahiliTech #Tanzania #TechTips #Learning #Coding #AI`;
  };

  const getWhatsAppCaption = () => {
    const title = content.title || content.name;
    const desc = content.summary || content.description || "";
    return `*${title}*\n\n${desc}\n\nSoma zaidi hapa: https://stea.africa\n\nJiunge na STEA Academy leo! 🚀`;
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: STEA_GOLD, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        🚀 Social Poster Export
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button 
          onClick={() => setShowStudio(true)}
          style={{ 
            background: `linear-gradient(135deg, ${STEA_GOLD}, #FFD17C)`, 
            border: 'none', 
            color: '#111', 
            padding: '10px 16px', 
            borderRadius: 12, 
            fontSize: 13, 
            fontWeight: 900, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: `0 4px 15px rgba(245,166,35,0.2)`
          }}
        >
          <Share2 size={16} /> OPEN POSTER STUDIO
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button 
          onClick={() => copyToClipboard(getInstagramCaption(), 'ig')}
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            color: '#fff', 
            padding: '8px 12px', 
            borderRadius: 10, 
            fontSize: 12, 
            fontWeight: 700, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {copied.ig ? <Check size={14} color="#00C48C" /> : <Copy size={14} />} Copy IG Caption
        </button>
        <button 
          onClick={() => copyToClipboard(getWhatsAppCaption(), 'wa')}
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            color: '#fff', 
            padding: '8px 12px', 
            borderRadius: 10, 
            fontSize: 12, 
            fontWeight: 700, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {copied.wa ? <Check size={14} color="#00C48C" /> : <Copy size={14} />} Copy WA Caption
        </button>
      </div>

      {showStudio && (
        <PosterStudio 
          content={content} 
          type={type} 
          onClose={() => setShowStudio(false)} 
        />
      )}
    </div>
  );
};

export default SocialPoster;
