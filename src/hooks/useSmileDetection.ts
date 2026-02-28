import React, { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import Webcam from 'react-webcam';

export function useSmileDetection(webcamRef: React.RefObject<Webcam | null>, isActive: boolean) {
  const [isSmiling, setIsSmiling] = useState(false);
  const [facesDetected, setFacesDetected] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const smileCounterRef = useRef<number>(0);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Error loading FaceLandmarker:", error);
      }
    };

    loadModel();

    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!isActive || !isModelLoaded || !webcamRef.current || !webcamRef.current.video) {
      cancelAnimationFrame(requestRef.current);
      setFacesDetected(false);
      setIsSmiling(false);
      return;
    }

    const detect = async () => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4 && faceLandmarkerRef.current) {
        const video = webcamRef.current.video;
        const startTimeMs = performance.now();
        const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          setFacesDetected(true);
          const categories = results.faceBlendshapes[0].categories;
          
          // Check for smile-related blendshapes
          const mouthSmileLeft = categories.find(c => c.categoryName === 'mouthSmileLeft')?.score || 0;
          const mouthSmileRight = categories.find(c => c.categoryName === 'mouthSmileRight')?.score || 0;
          
          // Threshold for smiling
          const smileThreshold = 0.45;
          
          if (mouthSmileLeft > smileThreshold && mouthSmileRight > smileThreshold) {
            // Require consistent smile for a few frames to avoid accidental triggers
            smileCounterRef.current += 1;
            if (smileCounterRef.current >= 5) {
              setIsSmiling(true);
            }
          } else {
            smileCounterRef.current = 0;
            setIsSmiling(false);
          }
        } else {
          setFacesDetected(false);
          setIsSmiling(false);
          smileCounterRef.current = 0;
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, isModelLoaded, webcamRef]);

  return { isSmiling, facesDetected, isModelLoaded };
}
