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
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [voiceActive, setVoiceActive] = useState(true); // Track if voice should be active
  
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const stepIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const synthRef = useRef(null);
  const recordingTimeRef = useRef(0); // Track actual time to avoid closure issues
  const voiceActiveRef = useRef(true); // Control voice from ref to prevent stale state

  // Voice instruction steps - fits within 30 seconds
  const voiceSteps = [
    { text: 'Look at the camera', duration: 3 },
    { text: 'Turn your head to the left slowly', duration: 5 },
    { text: 'Turn your head to the right slowly', duration: 5 },
    { text: 'Smile at the camera', duration: 3 },
    { text: 'Keep looking at the camera', duration: 14 }
  ];

  const MAX_RECORDING_DURATION = 30; // Changed from 15 to 30

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      cancelVoice();
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

  const cancelVoice = () => {
    if (synthRef.current) {
      window.speechSynthesis.cancel();
    }
  };

  const speak = (text) => {
    try {
      // Only speak if voice is active
      if (!voiceActiveRef.current) {
        console.log('Voice disabled, skipping:', text);
        return;
      }
      
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        return;
      }

      // Aggressive voice cancellation
      window.speechSynthesis.cancel();
      // Wait a tiny bit to ensure previous utterance is cancelled
      setTimeout(() => {
        if (!voiceActiveRef.current) return; // Check again after timeout
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onend = () => {
          console.log('Utterance ended:', text);
        };
        utterance.onerror = (e) => {
          console.log('Utterance error:', e);
        };
        
        if (voiceActiveRef.current) {
          window.speechSynthesis.speak(utterance);
          synthRef.current = utterance;
        }
      }, 10);
    } catch (err) {
      console.error('Speech error:', err);
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

    speak('Starting verification in 3 seconds');
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
          console.log('Data chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        try {
          console.log('Recording stopped, total chunks:', chunksRef.current.length);
          
          if (chunksRef.current.length === 0) {
            setError('Recording failed - no data captured. Please try again.');
            setIsRecording(false);
            return;
          }
          
          // Create blob immediately
          const blob = new Blob(chunksRef.current, { type: mimeType });
          console.log('Blob created:', {
            size: blob.size,
            type: blob.type,
            mimeType: mimeType,
            chunks: chunksRef.current.length,
            recordingTime: recordingTimeRef.current
          });
          
          if (blob.size === 0) {
            setError('Recording failed - empty file. Please try again.');
            setIsRecording(false);
            return;
          }
          
          const url = URL.createObjectURL(blob);
          console.log('Blob URL created:', url);
          
          // Use recorded time from ref (timer-based duration, which is accurate)
          const actualRecordedTime = recordingTimeRef.current;
          console.log('Actual recorded time:', actualRecordedTime);
          
          // CRITICAL: Set duration BEFORE showing preview to avoid 0:00 display
          setVideoDuration(actualRecordedTime);
          setIsVideoReady(false); // Reset - will be true once metadata loads
          
          setRecordedVideo({ 
            blob, 
            url, 
            mimeType, 
            recordedDuration: actualRecordedTime,
            isValid: true // Mark as valid video
          });
          
          setStage('preview');
          stopCamera();
          
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }
          if (stepIntervalRef.current) {
            clearInterval(stepIntervalRef.current);
          }
          
          speak('Recording complete. You can review your video now');
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
      recordingTimeRef.current = 0; // Reset ref
      setError('');

      // Voice guidance with timing
      speak(voiceSteps[0].text);
      
      let stepIndex = 0;
      let stepStartTime = 0;

      stepIntervalRef.current = setInterval(() => {
        if (stepIndex < voiceSteps.length - 1) {
          stepStartTime += 1;
          if (stepStartTime >= voiceSteps[stepIndex].duration) {
            stepIndex++;
            stepStartTime = 0;
            speak(voiceSteps[stepIndex].text);
          }
        }
      }, 1000);

      // Recording timer - show elapsed time, max 30 seconds
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1; // Update ref for accurate time
        
        if (recordingTimeRef.current >= MAX_RECORDING_DURATION) {
          // Clear intervals BEFORE stopping
          if (stepIntervalRef.current) {
            clearInterval(stepIntervalRef.current);
            stepIntervalRef.current = null;
          }
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
          
          // Stop voice
          window.speechSynthesis.cancel();
          
          // Stop recording
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
          
          speak('Recording time reached maximum');
          return;
        }
        
        setRecordingTime(recordingTimeRef.current); // Update UI
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // CRITICAL: Disable voice FIRST - use ref to prevent stale closures
      voiceActiveRef.current = false;
      setVoiceActive(false);
      
      // Aggressive voice cancellation - multiple calls to ensure it stops
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
      }
      
      // Clear all intervals FIRST to stop voice loop
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
        stepIntervalRef.current = null;
      }
      
      // Use ref value for accurate duration (not stale state)
      const actualDuration = recordingTimeRef.current;
      console.log('Recording stopped. Actual Duration:', actualDuration, 'seconds');
      
      // Update state with accurate duration before stopping recorder
      setRecordingTime(actualDuration);
      
      // CRITICAL: Request all pending data to be flushed before stopping
      // This ensures all video frames are captured in the blob
      try {
        console.log('Requesting data flush before stop...');
        mediaRecorderRef.current.requestData();
        
        // Small delay to ensure data is captured
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Stopping MediaRecorder with flushed data...');
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }, 50);
      } catch (err) {
        console.error('Error during stop:', err);
        mediaRecorderRef.current.stop();
        setIsRecording(false);
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
    setIsVideoReady(false);
    recordingTimeRef.current = 0;
    voiceActiveRef.current = true; // Re-enable voice
    setVoiceActive(true);
    setStage('capture');
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
      speak('Verification submitted successfully');
      
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
        const metadataDuration = previewVideoRef.current.duration;
        console.log('Video loaded, metadata duration:', metadataDuration);
        
        // Prefer recorded duration (from timer), use metadata as fallback
        if (recordedVideo?.recordedDuration && recordedVideo.recordedDuration > 0) {
          console.log('Using recorded duration:', recordedVideo.recordedDuration);
          setVideoDuration(recordedVideo.recordedDuration);
        } else if (!isNaN(metadataDuration) && metadataDuration > 0) {
          console.log('Using metadata duration:', metadataDuration);
          setVideoDuration(metadataDuration);
        } else {
          // If neither has duration, still show controls (video might be valid but missing metadata)
          console.log('No duration found, but allowing playback');
        }
        
        // Mark video as ready to show controls
        setIsVideoReady(true);
      }
    } catch (err) {
      console.error('Error getting video duration:', err);
      setIsVideoReady(true); // Show controls anyway
    }
  };

  const handlePreviewVideoError = (e) => {
    console.error('Video playback error:', e);
    setError('Unable to play recorded video. Please try retaking.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.verificationBox}>
        <h2 className={styles.title}>
          {verificationType === 'selfie' ? '📸 Take a Selfie' : '🎥 Identity Verification'}
        </h2>
        
        <p className={styles.instructions}>
          {stage === 'capture' && verificationType === 'selfie' && 'Take a clear photo of your face with good lighting'}
          {stage === 'capture' && verificationType === 'video' && `Position your face in the center. Record up to ${MAX_RECORDING_DURATION} seconds. Follow the voice instructions.`}
          {stage === 'preview' && 'Review your recording. You can retake or submit.'}
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
              {/* Minimal timer at bottom - doesn't block face */}
              {isRecording && (
                <div className={styles.timerOverlay}>
                  <div className={styles.timerDisplay}>{recordingTime}s / {MAX_RECORDING_DURATION}s</div>
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
                controls={isVideoReady}
                controlsList="nodownload"
                className={styles.preview}
                autoPlay={false}
                preload="metadata"
                onLoadedMetadata={handlePreviewVideoLoaded}
                onError={handlePreviewVideoError}
                onCanPlay={handlePreviewVideoLoaded}
                onDurationChange={handlePreviewVideoLoaded}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  display: 'block', 
                  backgroundColor: '#000'
                }}
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
                      ⏹️ Stop Recording ({recordingTime}s)
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
