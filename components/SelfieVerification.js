import { useState, useRef, useEffect } from 'react';
import styles from '../styles/SelfieVerification.module.css';

export default function SelfieVerification({ onVerificationComplete, verificationType = 'video' }) {
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
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      // Stop existing stream
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
      setError('Unable to access camera. Please grant camera permissions and ensure you have a working camera.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  const toggleCamera = async () => {
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

    // Start countdown
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
      
      // Determine best supported MIME type
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

      console.log('Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped. Total chunks:', chunksRef.current.length);
        if (chunksRef.current.length === 0) {
          setError('Recording failed - no data captured. Please try again.');
          setIsRecording(false);
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('Blob created:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          setError('Recording failed - empty file. Please try again.');
          setIsRecording(false);
          return;
        }
        
        const url = URL.createObjectURL(blob);
        setRecordedVideo({ blob, url, mimeType });
        stopCamera();
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
        setRecordingTime(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error}`);
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      setError('');

      // Timer for recording duration
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 15) {
            stopRecording();
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
        const filename = `verification_${Date.now()}.webm`;
        formData.append('file', recordedVideo.blob, filename);
        formData.append('type', 'video');
      } else {
        setError('No verification media captured');
        setIsUploading(false);
        return;
      }

      const { supabase } = await import('../lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Session expired. Please sign in again.');
        setIsUploading(false);
        return;
      }

      const response = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
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
            : 'Record a video (max 15 seconds) of yourself. Look at the camera and perform the following: 1) Look directly at camera, 2) Turn head left, 3) Turn head right, 4) Smile naturally.'}
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
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.video}
              />
              {isRecording && (
                <div className={styles.recordingTimer}>
                  🔴 Recording: {recordingTime}s
                </div>
              )}
            </>
          ) : capturedImage ? (
            <img src={capturedImage.url} alt="Captured selfie" className={styles.preview} />
          ) : recordedVideo ? (
            <video
              src={recordedVideo.url}
              controls
              controlsList="nodownload"
              className={styles.preview}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className={styles.controls}>
          {!capturedImage && !recordedVideo ? (
            <>
              {verificationType === 'selfie' ? (
                <>
                  <button
                    onClick={capturePhoto}
                    disabled={!stream || countdown !== null}
                    className={styles.captureButton}
                  >
                    📸 Capture Photo
                  </button>
                  <button
                    onClick={toggleCamera}
                    disabled={!stream || countdown !== null}
                    className={styles.flipButton}
                    title="Switch camera"
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
                        className={styles.recordButton}
                      >
                        {countdown !== null ? `Starting in ${countdown}...` : '🔴 Start Recording'}
                      </button>
                      <button
                        onClick={toggleCamera}
                        disabled={!stream || countdown !== null}
                        className={styles.flipButton}
                        title="Switch camera"
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
