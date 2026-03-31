import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

export default function ImageEditor({ image, onSave, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(16 / 9);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleSave = async () => {
    const croppedImage = await getCroppedImg(image, croppedAreaPixels);
    onSave(croppedImage);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', padding: 20 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
        <button onClick={() => setAspect(16 / 9)} style={{ padding: '10px 20px', background: aspect === 16/9 ? '#F5A623' : '#333', color: '#fff', border: 'none', borderRadius: 8 }}>16:9</button>
        <button onClick={() => setAspect(4 / 3)} style={{ padding: '10px 20px', background: aspect === 4/3 ? '#F5A623' : '#333', color: '#fff', border: 'none', borderRadius: 8 }}>4:3</button>
        <button onClick={() => setAspect(1 / 1)} style={{ padding: '10px 20px', background: aspect === 1/1 ? '#F5A623' : '#333', color: '#fff', border: 'none', borderRadius: 8 }}>1:1</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: 8 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: '10px 20px', background: '#F5A623', color: '#000', border: 'none', borderRadius: 8, fontWeight: 800 }}>Save</button>
      </div>
    </div>
  );
}
