import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photoBase64: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
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
        setError('กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่า browser');
      } else if (err.name === 'NotFoundError') {
        setError('ไม่พบกล้องบนอุปกรณ์นี้');
      } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        setError('กล้องถูกใช้งานอยู่ กรุณาปิดแอปอื่นที่ใช้กล้อง');
      } else {
        setError('ไม่สามารถเปิดกล้องได้ กรุณาใช้ HTTPS หรืออนุญาตการเข้าถึงกล้อง');
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(
      '📍 ' + new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' }),
      10, canvas.height - 14
    );

    const photoData = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedPhoto(photoData);
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
              onClick={startCamera} 
              style={{ 
                padding: '14px 28px', background: 'var(--primary-gradient)', color: 'white', 
                borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem'
              }}
            >
              ลองเปิดกล้องอีกครั้ง
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.75rem', opacity: 0.5 }}>
              * ต้องถ่ายรูปจากกล้องเท่านั้น ไม่สามารถใช้รูปจากแกลเลอรีได้
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
        ) : cameraReady ? (
          <button onClick={takePhoto} style={{ 
            width: '70px', height: '70px', borderRadius: '50%', 
            background: 'white', border: '4px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <Camera size={28} color="#333" />
          </button>
        ) : null}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
