import { useState, useRef, useEffect } from 'react';
import styles from '../styles/SelfieVerification.module.css';

export default function SelfieVerification({ onVerificationComplete, verificationType = 'video' }) {
  const [stage, setStage] = useState('capture'); // capture, preview, uploading
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [currentStep, setCurrentStep] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const streamRef = useRef(null);

  const steps = [
    { instruction: 'Look at the camera', emoji: '👁️' },
    { instruction: 'Turn your head LEFT slowly', emoji: '⬅️' },
    { instruction: 'Turn your head RIGHT slowly', emoji: '➡️' },
    { instruction: 'Smile naturally at the camera', emoji: '😊' },
    { instruction: 'Great! Keep looking at camera', emoji: '✓' }
  ];

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: verificationType === 'video'
      });
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check camera permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Unable to capture photo. Please try again.');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Video not ready. Please wait a moment and try again.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedImage({ blob, url });
      setStage('preview');
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const startRecording = () => {
    if (!stream) {
      setError('Camera not ready. Please try again.');
      return;
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0 || !videoTracks[0].enabled) {
      setError('Video track not available. Please check camera permissions.');
      return;
    }

    setCountdown(3);
    setCurrentStep(0);
    
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
      if (!stream) {
        throw new Error('Stream not available');
      }

      chunksRef.current = [];
      
      let mimeType = 'video/webm';
      const mimeTypes = [
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9', 
        'video/webm',
        'video/mp4'
      ];

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          if (chunksRef.current.length === 0) {
            setError('Recording failed - no data captured. Please try again.');
            setIsRecording(false);
            return;
          }
          
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          if (blob.size === 0) {
            setError('Recording failed - empty file. Please try again.');
            setIsRecording(false);
            return;
          }
          
          console.log('Video recorded:', {
            size: blob.size,
            type: blob.type,
            chunks: chunksRef.current.length,
            mimeType
          });
          
          const url = URL.createObjectURL(blob);
          setRecordedVideo({ blob, url, mimeType });
          setStage('preview');
          stopCamera();
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }
        } catch (err) {
          console.error('Error processing recording:', err);
          setError('Failed to process recording. Please try again.');
          setIsRecording(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error}`);
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setError('');

      // Step progression every 3 seconds
      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < steps.length - 1) {
          stepIndex++;
          setCurrentStep(stepIndex);
        }
      }, 3000);

      // Recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 15) {
            stopRecording();
            clearInterval(stepInterval);
            return 15;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setRecordedVideo(null);
    setError('');
    setUploadProgress(0);
    setRecordingTime(0);
    setVideoDuration(0);
    setStage('capture');
    setCurrentStep(0);
    startCamera();
  };

  const submitVerification = async () => {
    setStage('uploading');
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      
      if (verificationType === 'selfie' && capturedImage) {
        formData.append('file', capturedImage.blob, 'selfie.jpg');
        formData.append('type', 'selfie');
      } else if (verificationType === 'video' && recordedVideo) {
        const filename = `verification_${Date.now()}.webm`;
        formData.append('file', recordedVideo.blob, filename);
        formData.append('type', 'video');
      } else {
        setError('No verification media captured');
        setIsUploading(false);
        setStage('preview');
        return;
      }

      const { supabase } = await import('../lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Session expired. Please sign in again.');
        setIsUploading(false);
        setStage('preview');
        return;
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 30;
        });
      }, 300);

      const response = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      clearInterval(progressInterval);

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
      setIsUploading(false);
      setStage('preview');
    }
  };

  const handlePreviewVideoLoaded = () => {
    try {
      if (previewVideoRef.current) {
        const duration = previewVideoRef.current.duration;
        console.log('Video loaded, duration:', duration);
        setVideoDuration(duration || 0);
      }
    } catch (err) {
      console.error('Error getting video duration:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.verificationBox}>
        <h2 className={styles.title}>
          {verificationType === 'selfie' ? '📸 Take a Selfie' : '🎥 Identity Verification'}
        </h2>
        
        <p className={styles.instructions}>
          {stage === 'capture' && verificationType === 'selfie' && 'Take a clear photo of your face with good lighting'}
          {stage === 'capture' && verificationType === 'video' && 'Follow the on-screen instructions. We need 15 seconds of video to verify your identity.'}
          {stage === 'preview' && 'Review your capture before submitting'}
          {stage === 'uploading' && 'Uploading your verification...'}
        </p>

        {error && (
          <div className={styles.error}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div className={styles.videoContainer}>
          {stage === 'capture' && (
            <>
              {/* Recording Instructions Overlay */}
              {isRecording && verificationType === 'video' && (
                <div className={styles.instructionsOverlay}>
                  <div className={styles.stepIndicators}>
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`${styles.stepIndicator} ${
                          idx === currentStep ? styles.activeStep : ''
                        } ${idx < currentStep ? styles.completedStep : ''}`}
                      >
                        <span className={styles.stepNumber}>{idx + 1}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.currentInstruction}>
                    <div className={styles.instructionEmoji}>{steps[currentStep]?.emoji}</div>
                    <div className={styles.instructionText}>{steps[currentStep]?.instruction}</div>
                  </div>

                  <div className={styles.recordingTimer}>
                    🔴 {recordingTime}s / 15s
                  </div>
                </div>
              )}

              {countdown !== null && (
                <div className={styles.countdown}>{countdown}</div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.video}
              />
            </>
          )}

          {stage === 'preview' && capturedImage && (
            <img src={capturedImage.url} alt="Captured selfie" className={styles.preview} />
          )}

          {stage === 'preview' && recordedVideo && (
            <div className={styles.videoPreviewWrapper}>
              <video
                ref={previewVideoRef}
                src={recordedVideo.url}
                controls
                controlsList="nodownload"
                className={styles.preview}
                autoPlay
                onLoadedMetadata={handlePreviewVideoLoaded}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {videoDuration > 0 && (
                <div className={styles.videoDurationBadge}>
                  ⏱️ {videoDuration.toFixed(1)}s recorded
                </div>
              )}
            </div>
          )}

          {stage === 'uploading' && (
            <div className={styles.uploadingContainer}>
              <div className={styles.uploadingSpinner}></div>
              <p className={styles.uploadingText}>Verifying your identity...</p>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className={styles.controls}>
          {stage === 'capture' && (
            <>
              {verificationType === 'selfie' ? (
                <>
                  <button
                    onClick={capturePhoto}
                    disabled={!stream || countdown !== null}
                    className={styles.primaryButton}
                  >
                    📸 Capture Photo
                  </button>
                  <button
                    onClick={toggleCamera}
                    disabled={!stream}
                    className={styles.secondaryButton}
                  >
                    🔄 Flip Camera
                  </button>
                </>
              ) : (
                <>
                  {!isRecording ? (
                    <>
                      <button
                        onClick={startRecording}
                        disabled={!stream || countdown !== null}
                        className={styles.primaryButton}
                      >
                        {countdown !== null ? `Starting in ${countdown}...` : '🔴 Start Recording'}
                      </button>
                      <button
                        onClick={toggleCamera}
                        disabled={!stream || countdown !== null}
                        className={styles.secondaryButton}
                      >
                        🔄 Flip Camera
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className={styles.stopButton}
                    >
                      ⏹️ Stop ({recordingTime}s)
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {stage === 'preview' && (
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
                {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : '✓ Submit'}
              </button>
            </div>
          )}

          {stage === 'uploading' && (
            <div className={styles.progressBar}>
              <div className={styles.progress} style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
