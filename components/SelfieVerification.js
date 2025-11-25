import { useState, useRef, useEffect } from 'react';
import styles from '../styles/SelfieVerification.module.css';

export default function SelfieVerification({ onVerificationComplete, verificationType = 'video' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: verificationType === 'video'
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedImage({ blob, url });
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const startRecording = () => {
    if (!stream) {
      setError('Camera not ready. Please try again.');
      return;
    }

    // Countdown before recording
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          beginRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const beginRecording = () => {
    try {
      chunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp9' };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo({ blob, url });
        stopCamera();
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 15 seconds for comprehensive liveness verification
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 15000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setRecordedVideo(null);
    setError('');
    setUploadProgress(0);
    startCamera();
  };

  const submitVerification = async () => {
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      
      if (verificationType === 'selfie' && capturedImage) {
        formData.append('file', capturedImage.blob, 'selfie.jpg');
        formData.append('type', 'selfie');
      } else if (verificationType === 'video' && recordedVideo) {
        formData.append('file', recordedVideo.blob, 'verification.webm');
        formData.append('type', 'video');
      } else {
        setError('No verification media captured');
        setIsUploading(false);
        return;
      }

      const response = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await import('../lib/supabaseClient')).supabase.auth.session()?.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      const data = await response.json();
      setUploadProgress(100);
      
      if (onVerificationComplete) {
        onVerificationComplete(data);
      }
    } catch (err) {
      console.error('Error submitting verification:', err);
      setError(err.message || 'Failed to submit verification. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.verificationBox}>
        <h2 className={styles.title}>
          {verificationType === 'selfie' ? 'Take a Selfie' : 'Video Liveness Verification'}
        </h2>
        
        <p className={styles.instructions}>
          {verificationType === 'selfie' 
            ? 'Please take a clear photo of your face. Make sure your face is well-lit and clearly visible.'
            : 'Please record a video for liveness verification (max 15 seconds). Follow these steps: 1) Look directly at the camera, 2) Slowly turn your head to the left, 3) Turn your head to the right, 4) Smile naturally. Ensure good lighting and that your entire face is visible.'}
        </p>

        {error && (
          <div className={styles.error}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div className={styles.videoContainer}>
          {countdown !== null && (
            <div className={styles.countdown}>{countdown}</div>
          )}

          {!capturedImage && !recordedVideo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.video}
            />
          ) : capturedImage ? (
            <img src={capturedImage.url} alt="Captured selfie" className={styles.preview} />
          ) : (
            <video
              src={recordedVideo.url}
              controls
              className={styles.preview}
            />
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className={styles.controls}>
          {!capturedImage && !recordedVideo ? (
            <>
              {verificationType === 'selfie' ? (
                <button
                  onClick={capturePhoto}
                  disabled={!stream || countdown !== null}
                  className={styles.captureButton}
                >
                  📸 Capture Photo
                </button>
              ) : (
                <>
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={!stream || countdown !== null}
                      className={styles.recordButton}
                    >
                      {countdown !== null ? `Starting in ${countdown}...` : '🔴 Start Recording'}
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className={styles.stopButton}
                    >
                      ⏹️ Stop Recording
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <div className={styles.actionButtons}>
              <button
                onClick={retake}
                disabled={isUploading}
                className={styles.retakeButton}
              >
                🔄 Retake
              </button>
              <button
                onClick={submitVerification}
                disabled={isUploading}
                className={styles.submitButton}
              >
                {isUploading ? `Uploading... ${uploadProgress}%` : '✓ Submit Verification'}
              </button>
            </div>
          )}
        </div>

        {isUploading && (
          <div className={styles.progressBar}>
            <div className={styles.progress} style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
