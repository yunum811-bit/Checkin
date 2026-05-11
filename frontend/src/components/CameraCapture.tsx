import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, X, Image } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photoBase64: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraReady(true);
      setError('');
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraReady(false);
      if (err.name === 'NotAllowedError') {
        setError('กรุณาอนุญาตการเข้าถึงกล้อง หรือเลือกรูปจากแกลเลอรี');
      } else if (err.name === 'NotFoundError') {
        setError('ไม่พบกล้อง กรุณาเลือกรูปจากแกลเลอรี');
      } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        setError('กล้องถูกใช้งานอยู่ กรุณาเลือกรูปจากแกลเลอรี');
      } else {
        // On HTTP (non-HTTPS), camera is blocked
        setError('ไม่สามารถเปิดกล้องได้ (ต้องใช้ HTTPS) กรุณาเลือกรูปจากแกลเลอรี');
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    
    // Add timestamp watermark
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = 'white';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(
      new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' }),
      10, canvas.height - 12
    );

    const photoData = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedPhoto(photoData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Resize to max 640px
        const maxSize = 640;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);

        // Add timestamp watermark
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, height - 36, width, 36);
        ctx.fillStyle = 'white';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText(
          new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' }),
          10, height - 12
        );

        const photoData = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedPhoto(photoData);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedPhoto(null);
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      onCapture(capturedPhoto);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000', display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', background: 'rgba(0,0,0,0.9)',
        paddingTop: 'max(12px, env(safe-area-inset-top))'
      }}>
        <button onClick={handleCancel} style={{ background: 'none', color: 'white', padding: '8px' }}>
          <X size={24} />
        </button>
        <span style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
          📸 ถ่ายรูปยืนยัน
        </span>
        {cameraReady ? (
          <button onClick={switchCamera} style={{ background: 'none', color: 'white', padding: '8px' }}>
            <RotateCcw size={22} />
          </button>
        ) : <div style={{ width: '40px' }} />}
      </div>

      {/* Camera View / Preview / Error */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {capturedPhoto ? (
          <img 
            src={capturedPhoto} 
            alt="Captured" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
          />
        ) : cameraReady ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              width: '100%', height: '100%', objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
            }}
          />
        ) : (
          <div style={{ color: 'white', textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📷</div>
            <p style={{ marginBottom: '20px', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8 }}>{error}</p>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              style={{ 
                padding: '14px 28px', background: 'var(--primary-gradient)', color: 'white', 
                borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Image size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              เลือกรูปจากแกลเลอรี
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.75rem', opacity: 0.5 }}>
              หรือถ่ายรูปจากแอปกล้องแล้วเลือกรูป
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ 
        padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px',
        background: 'rgba(0,0,0,0.9)', 
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
      }}>
        {capturedPhoto ? (
          <>
            <button onClick={retake} style={{ 
              width: '56px', height: '56px', borderRadius: '50%', 
              background: 'rgba(255,255,255,0.15)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <RotateCcw size={24} />
            </button>
            <button onClick={confirmPhoto} style={{ 
              width: '70px', height: '70px', borderRadius: '50%', 
              background: '#10B981', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
            }}>
              <Check size={32} />
            </button>
          </>
        ) : (
          <>
            {/* Gallery button */}
            <button onClick={() => fileInputRef.current?.click()} style={{ 
              width: '48px', height: '48px', borderRadius: '50%', 
              background: 'rgba(255,255,255,0.15)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Image size={22} />
            </button>

            {/* Shutter button (only if camera is ready) */}
            {cameraReady && (
              <button onClick={takePhoto} style={{ 
                width: '70px', height: '70px', borderRadius: '50%', 
                background: 'white', border: '4px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                <Camera size={28} color="#333" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
