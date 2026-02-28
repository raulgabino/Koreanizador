import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useSmileDetection } from '../hooks/useSmileDetection';
import { koreanizeImage } from '../services/gemini';
import { Camera, RefreshCw, Printer, Maximize, Loader2, Sparkles, User, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Kiosk() {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [processedImg, setProcessedImg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [mode, setMode] = useState<'camera' | 'preview' | 'result'>('camera');
  const [canCapture, setCanCapture] = useState(true);
  
  // Smile detection state
  const { isSmiling, facesDetected, isModelLoaded } = useSmileDetection(
    webcamRef, 
    mode === 'camera' && countdown === null && canCapture
  );

  // Auto-capture on smile ONLY if a face is detected and we are in camera mode
  useEffect(() => {
    if (canCapture && facesDetected && isSmiling && mode === 'camera' && countdown === null && isModelLoaded) {
      startCountdown();
    }
  }, [isSmiling, facesDetected, mode, countdown, isModelLoaded, canCapture]);

  const startCountdown = () => {
    if (countdown !== null || !canCapture) return;
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      capture();
    }
  }, [countdown]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      setMode('preview');
      setCountdown(null);
      processImage(imageSrc);
    }
  }, [webcamRef]);

  const processImage = async (imageSrc: string) => {
    setIsProcessing(true);
    try {
      const result = await koreanizeImage(imageSrc);
      setProcessedImg(result);
      setMode('result');
    } catch (error) {
      console.error("Processing failed", error);
      alert("Failed to process image. Please try again.");
      setMode('camera');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setImgSrc(null);
    setProcessedImg(null);
    setMode('camera');
    setCountdown(null);
    setCanCapture(false);
    // 2 second cooldown before allowing another capture
    setTimeout(() => setCanCapture(true), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const getStatusMessage = () => {
    if (!isModelLoaded) return "Cargando visión IA...";
    if (!canCapture && mode === 'camera') return "Preparando cámara...";
    if (countdown !== null) return "¡No te muevas!";
    if (!facesDetected) return "Esperando sujeto...";
    if (!isSmiling) return "¡Sonríe para la foto!";
    return "¡Perfecto! Mantén la sonrisa...";
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white overflow-hidden flex flex-col items-center justify-center relative">
      
      {/* Header / Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 print:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="text-yellow-400" />
          <h1 className="text-xl font-bold tracking-wider uppercase">Koreanize Kiosk</h1>
        </div>
        <div className="flex gap-4">
          <button onClick={toggleFullScreen} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Maximize size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-5xl aspect-[4/3] relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 print:border-none print:shadow-none print:w-full print:h-full print:rounded-none">
        
        {/* Camera View */}
        {mode === 'camera' && (
          <div className="relative w-full h-full">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
              videoConstraints={{
                width: 1280,
                height: 720,
                facingMode: "user"
              }}
              mirrored={false} // We handle mirroring via CSS
              imageSmoothing={true}
              forceScreenshotSourceSize={true}
              disablePictureInPicture={true}
              onUserMedia={() => {}}
              onUserMediaError={() => {}}
              screenshotQuality={0.92}
            />
            
            {/* Overlays */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`transition-all duration-500 ${facesDetected || !isModelLoaded ? 'opacity-100' : 'opacity-50'}`}>
                <div className="bg-black/40 backdrop-blur-md px-8 py-4 rounded-full border border-white/20 text-center">
                  <p className={`text-2xl font-light tracking-wide ${isSmiling && facesDetected ? 'text-yellow-400' : 'text-white'}`}>
                    {getStatusMessage()}
                  </p>
                </div>
              </div>

              <AnimatePresence>
                {countdown !== null && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    exit={{ scale: 2, opacity: 0 }}
                    key={countdown}
                    className="text-9xl font-bold text-white drop-shadow-lg absolute"
                  >
                    {countdown === 0 ? "¡CLICK!" : countdown}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Manual Trigger (Bottom Right) */}
            <div className="absolute bottom-8 right-8 z-10">
               <button 
                 onClick={startCountdown}
                 disabled={countdown !== null}
                 className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 transition-all active:scale-95 disabled:opacity-50"
                 title="Captura manual"
               >
                 <Camera size={32} />
               </button>
            </div>
          </div>
        )}

        {/* Processing View */}
        {mode === 'preview' && (
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-neutral-800">
            {imgSrc && (
              <img src={imgSrc} alt="Captured" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />
            )}
            <div className="z-10 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-xl opacity-75 animate-pulse"></div>
                <div className="relative bg-black p-4 rounded-full">
                  <Loader2 className="w-12 h-12 animate-spin text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-light tracking-widest uppercase">Koreanizing...</h2>
              <p className="text-white/60">Applying Hanbok and style</p>
            </div>
          </div>
        )}

        {/* Result View */}
        {mode === 'result' && processedImg && (
          <div className="w-full h-full relative group">
            <img src={processedImg} alt="Koreanized" className="w-full h-full object-contain bg-black" />
            
            {/* Actions Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent flex justify-center gap-6 print:hidden translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <button onClick={reset} className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-white/20">
                  <RefreshCw size={24} />
                </div>
                <span className="text-xs uppercase tracking-wider">Retake</span>
              </button>
              
              <button onClick={handlePrint} className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-white/20">
                  <Printer size={24} />
                </div>
                <span className="text-xs uppercase tracking-wider">Print</span>
              </button>

               <a href={processedImg} download="koreanized-photo.jpg" className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-white/20">
                  <Download size={24} />
                </div>
                <span className="text-xs uppercase tracking-wider">Save</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Footer */}
      <div className="mt-8 text-white/40 text-sm font-mono tracking-widest uppercase print:hidden">
        {mode === 'camera' ? 'Face the camera • Smile to capture' : mode === 'result' ? 'Hover image for options' : 'Processing magic...'}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { background: white; color: black; }
          .print\\:hidden { display: none !important; }
          .print\\:w-full { width: 100vw !important; height: 100vh !important; max-width: none !important; }
          .print\\:h-full { height: 100vh !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border-none { border: none !important; }
        }
      `}</style>
    </div>
  );
}
