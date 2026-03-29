import { useState, useEffect } from 'react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 2000,
      background: '#111',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid #333',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <p>Install STEA App</p>
      <button onClick={handleInstall} style={{
        background: '#F5A623',
        color: '#000',
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}>Install</button>
      <button onClick={() => setShowPrompt(false)} style={{
        background: 'transparent',
        color: '#888',
        border: 'none',
        cursor: 'pointer'
      }}>Dismiss</button>
    </div>
  );
};
