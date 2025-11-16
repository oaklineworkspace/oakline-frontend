import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const cropContainerRef = useRef(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await Promise.all([
        fetchUserProfile(user.id),
        fetchUserAccounts(user.id)
      ]);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserAccounts = async (userId) => {
    try {
      let accountsData = [];
      
      const { data: directAccounts, error: directError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (directAccounts && directAccounts.length > 0) {
        accountsData = directAccounts;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: emailAccounts, error: emailError } = await supabase
            .from('accounts')
            .select('*')
            .or(`user_email.eq.${user.email},email.eq.${user.email}`)
            .order('created_at', { ascending: false });

          if (emailAccounts && emailAccounts.length > 0) {
            accountsData = emailAccounts;
          } else {
            const { data: applications, error: appError } = await supabase
              .from('applications')
              .select('id')
              .eq('email', user.email);

            if (applications && applications.length > 0) {
              const { data: appAccounts, error: appAccountsError } = await supabase
                .from('accounts')
                .select('*')
                .in('application_id', applications.map(app => app.id))
                .order('created_at', { ascending: false});

              if (appAccounts) {
                accountsData = appAccounts;
              }
            }
          }
        }
      }

      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Center the image
          setImagePosition({ x: 0, y: 0 });
          setImageScale(1);
          setImageSrc(event.target.result);
          setShowCropper(true);
          setMessage('');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      setMessage('Please select a valid image file');
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - imagePosition.x,
      y: touch.clientY - imagePosition.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setImagePosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (e) => {
    setImageScale(parseFloat(e.target.value));
  };

  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current || !cropContainerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = imageRef.current;
    const container = cropContainerRef.current;

    // Set canvas size to output size (300x300 for circular crop)
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Get the crop circle dimensions
    const cropCircleSize = 300; // This matches the circle overlay size
    const containerRect = container.getBoundingClientRect();
    
    // Calculate the center of the crop circle
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const radius = cropCircleSize / 2;

    // Calculate source dimensions based on image position and scale
    const imageWidth = image.naturalWidth * imageScale;
    const imageHeight = image.naturalHeight * imageScale;
    
    // Calculate the position offset
    const offsetX = centerX - imagePosition.x;
    const offsetY = centerY - imagePosition.y;

    // Calculate source crop area
    const sourceRadius = (radius / imageScale);
    const sourceX = (offsetX / imageScale) - sourceRadius;
    const sourceY = (offsetY / imageScale) - sourceRadius;
    const sourceSize = sourceRadius * 2;

    // Draw circular crop
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      image,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, outputSize, outputSize
    );
    ctx.restore();

    canvas.toBlob((blob) => {
      const croppedFile = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
      setProfilePicture(croppedFile);
      setCroppedImage(URL.createObjectURL(blob));
      setShowCropper(false);
      setImagePosition({ x: 0, y: 0 });
      setImageScale(1);
    }, 'image/jpeg', 0.95);
  };

  const cancelCrop = () => {
    setShowCropper(false);
    setImageSrc(null);
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setIsDragging(false);
  };

  const uploadProfilePicture = async () => {
    if (!profilePicture) {
      setMessage('Please select a profile picture first');
      return;
    }

    if (!user?.id) {
      setMessage('Unable to upload - please log in again');
      return;
    }

    setUploadingPicture(true);
    setMessage('');
    
    try {
      const fileExt = profilePicture.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, profilePicture, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      const profilePictureUrl = data.publicUrl;

      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_picture: profilePictureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (updateError) throw updateError;

      if (!updateData || updateData.length === 0) {
        throw new Error('Profile not found. Please contact customer support at +1 (636) 635-6122');
      }

      setUserProfile(prev => ({ ...(prev || {}), profile_picture: profilePictureUrl }));
      setProfilePicture(null);
      setMessage('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setMessage(error.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => total + parseFloat(account.balance || 0), 0);
  };

  const maskSensitiveInfo = (info) => {
    if (!info) return 'N/A';
    return '•'.repeat(info.length - 4) + info.slice(-4);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>My Profile</h1>
          <button 
            style={styles.menuButton}
            onClick={() => router.push('/main-menu')}
          >
            ☰
          </button>
        </div>
        <div style={styles.headerActions}>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/dashboard')}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {message && (
        <div style={message.includes('success') ? styles.message : styles.error}>
          {message}
        </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && (
        <div className="cropperModal" style={styles.cropperModal} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="cropperContent" style={styles.cropperContent}>
            <h2 className="cropperTitle" style={styles.cropperTitle}>Crop Your Profile Picture</h2>
            <p className="cropperHint" style={styles.cropperHint}>Drag to position • Pinch or slide to zoom</p>
            
            <div 
              ref={cropContainerRef}
              className="cropperImageContainer"
              style={styles.cropperImageContainer}
            >
              <img 
                ref={imageRef}
                src={imageSrc} 
                alt="To crop" 
                style={{
                  ...styles.cropperImage,
                  transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                draggable={false}
              />
              {/* Circular overlay */}
              <div style={styles.circularOverlay}>
                <svg width="100%" height="100%" style={styles.cropOverlaySvg}>
                  <defs>
                    <mask id="circleMask">
                      <rect width="100%" height="100%" fill="white" />
                      <circle cx="50%" cy="50%" r="150" fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#circleMask)" />
                  <circle cx="50%" cy="50%" r="150" fill="none" stroke="white" strokeWidth="3" strokeDasharray="5,5" />
                </svg>
              </div>
            </div>

            {/* Zoom slider */}
            <div style={styles.zoomControlContainer}>
              <span style={styles.zoomLabel}>🔍</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={imageScale}
                onChange={handleZoomChange}
                style={styles.zoomSlider}
              />
              <span style={styles.zoomLabel}>🔍+</span>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            <div className="cropperActions" style={styles.cropperActions}>
              <button onClick={cancelCrop} style={styles.cropperCancelButton}>
                Cancel
              </button>
              <button onClick={handleCrop} style={styles.cropperCropButton}>
                Crop & Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Upload Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Profile Picture</h2>
        <div style={styles.profilePictureSection}>
          <div style={styles.profilePictureDisplay}>
            {(croppedImage || userProfile?.profile_picture) ? (
              <img 
                src={croppedImage || userProfile.profile_picture} 
                alt="Profile" 
                style={styles.profileImage}
              />
            ) : (
              <div style={styles.placeholderImage}>
                <span style={styles.placeholderText}>
                  {userProfile ? 
                    `${userProfile.first_name?.[0] || ''}${userProfile.last_name?.[0] || ''}`.toUpperCase() || '?' 
                    : '?'}
                </span>
              </div>
            )}
          </div>
          <div style={styles.uploadSection}>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              style={styles.fileInput}
              id="profile-picture-input"
            />
            <label htmlFor="profile-picture-input" style={styles.fileLabel}>
              {profilePicture ? 'Change Photo' : 'Choose File'}
            </label>
            {profilePicture && (
              <button 
                onClick={uploadProfilePicture}
                disabled={uploadingPicture}
                style={uploadingPicture ? styles.uploadButtonDisabled : styles.uploadButton}
              >
                {uploadingPicture ? 'Uploading...' : 'Upload Picture'}
              </button>
            )}
            <p style={styles.uploadHint}>Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
          </div>
        </div>
      </div>

      {/* Information Notice */}
      <div style={styles.noticeCard}>
        <div style={styles.noticeIcon}>ℹ️</div>
        <div style={styles.noticeContent}>
          <h3 style={styles.noticeTitle}>Need to Update Your Information?</h3>
          <p style={styles.noticeText}>
            For security purposes, personal information changes must be verified by our customer care team. 
            Please contact us at <a href="tel:+16366356122" style={styles.noticeLink}>+1 (636) 635-6122</a> or 
            email <a href="mailto:contact-us@theoaklinebank.com" style={styles.noticeLink}>contact-us@theoaklinebank.com</a>
          </p>
        </div>
      </div>

      {/* Personal Information Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Personal Information</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Full Name</span>
            <span style={styles.infoValue}>
              {userProfile ? `${userProfile.first_name || ''} ${userProfile.middle_name ? userProfile.middle_name + ' ' : ''}${userProfile.last_name || ''}`.trim() : 'N/A'}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{userProfile?.email || user?.email || 'N/A'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Phone</span>
            <span style={styles.infoValue}>{userProfile?.phone || 'N/A'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Date of Birth</span>
            <span style={styles.infoValue}>{formatDate(userProfile?.date_of_birth)}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Address</span>
            <span style={styles.infoValue}>
              {userProfile?.address ? 
                `${userProfile.address}${userProfile.city ? ', ' + userProfile.city : ''}${userProfile.state ? ', ' + userProfile.state : ''} ${userProfile.zip_code || ''}`.trim() : 
                'N/A'
              }
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Country</span>
            <span style={styles.infoValue}>{userProfile?.country || 'N/A'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Member Since</span>
            <span style={styles.infoValue}>{formatDate(userProfile?.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Account Summary Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Account Summary</h2>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Accounts</span>
            <span style={styles.summaryValue}>{accounts.length}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Balance</span>
            <span style={styles.summaryValueLarge}>{formatCurrency(getTotalBalance())}</span>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>My Accounts ({accounts.length})</h2>
        {accounts.length === 0 ? (
          <div style={styles.noAccounts}>
            <p>No accounts found. Please contact support.</p>
          </div>
        ) : (
          <div style={styles.accountsList}>
            {accounts.map(account => (
              <div key={account.id} style={styles.accountCard}>
                <div style={styles.accountHeader}>
                  <h3 style={styles.accountTitle}>
                    {account.account_name || `${account.account_type?.charAt(0).toUpperCase() + account.account_type?.slice(1) || 'Account'}`}
                  </h3>
                  <span style={styles.accountType}>{account.account_type}</span>
                </div>
                <div style={styles.accountDetails}>
                  <div style={styles.accountRow}>
                    <span style={styles.accountLabel}>Account Number:</span>
                    <span style={styles.accountValue}>****{account.account_number?.slice(-4)}</span>
                  </div>
                  <div style={styles.accountRow}>
                    <span style={styles.accountLabel}>Balance:</span>
                    <span style={styles.accountBalance}>
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                  <div style={styles.accountRow}>
                    <span style={styles.accountLabel}>Status:</span>
                    <span style={{
                      ...styles.accountValue,
                      color: account.status === 'active' ? '#10b981' : '#f59e0b',
                      fontWeight: '600'
                    }}>
                      {account.status ? account.status.charAt(0).toUpperCase() + account.status.slice(1) : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Security & Settings</h2>
        <div style={styles.securityGrid}>
          <button 
            style={styles.securityButton}
            onClick={() => router.push('/security')}
          >
            🔐 Change Password
          </button>
          <button 
            style={styles.securityButton}
            onClick={() => router.push('/mfa-setup')}
          >
            🛡️ Two-Factor Auth
          </button>
          <button 
            style={styles.securityButton}
            onClick={() => router.push('/security')}
          >
            🔒 Security Settings
          </button>
          <button 
            style={styles.logoutButton}
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .cropperModal {
            padding: 10px !important;
          }
          .cropperContent {
            padding: 16px !important;
            max-height: 95vh !important;
          }
          .cropperImageContainer {
            height: 280px !important;
          }
          .cropperTitle {
            font-size: 18px !important;
          }
          .cropperActions {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .cropperActions button {
            width: 100% !important;
          }
        }
        
        @media (max-height: 700px) {
          .cropperImageContainer {
            height: 250px !important;
          }
          .cropperContent {
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '0 0 80px 0',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '15px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0
  },
  menuButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  error: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 15px',
    borderRadius: '8px',
    margin: '15px',
    fontSize: '14px'
  },
  message: {
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '12px 15px',
    borderRadius: '8px',
    margin: '15px',
    fontSize: '14px'
  },
  noticeCard: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    margin: '15px',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  noticeIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  noticeContent: {
    flex: 1
  },
  noticeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    margin: '0 0 8px 0'
  },
  noticeText: {
    fontSize: '14px',
    color: '#1e3a8a',
    margin: 0,
    lineHeight: '1.5'
  },
  noticeLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '500',
    borderBottom: '1px solid #93c5fd'
  },
  card: {
    backgroundColor: 'white',
    margin: '15px',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0'
  },
  profilePictureSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  },
  profilePictureDisplay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileImage: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #e2e8f0',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  placeholderImage: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '4px solid #e2e8f0',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  placeholderText: {
    fontSize: '40px',
    fontWeight: 'bold',
    color: 'white'
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    width: '100%'
  },
  fileInput: {
    display: 'none'
  },
  fileLabel: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '2px dashed #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
    fontWeight: '500'
  },
  uploadButton: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  uploadButtonDisabled: {
    padding: '10px 24px',
    backgroundColor: '#94a3b8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  uploadHint: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
    margin: '0'
  },
  infoGrid: {
    display: 'grid',
    gap: '16px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '15px',
    color: '#1e293b',
    fontWeight: '500'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    gap: '8px'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center'
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b'
  },
  summaryValueLarge: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#10b981'
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  noAccounts: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b'
  },
  accountCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e2e8f0'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  accountTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  accountType: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  accountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accountLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500'
  },
  accountValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500'
  },
  accountBalance: {
    fontSize: '16px',
    color: '#10b981',
    fontWeight: '600'
  },
  securityGrid: {
    display: 'grid',
    gap: '10px'
  },
  securityButton: {
    padding: '14px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  logoutButton: {
    padding: '14px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  cropperModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    overflowY: 'auto'
  },
  cropperContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    margin: 'auto'
  },
  cropperTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 6px 0',
    textAlign: 'center'
  },
  cropperHint: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 16px 0',
    textAlign: 'center',
    fontWeight: '500'
  },
  cropperImageContainer: {
    position: 'relative',
    width: '100%',
    height: '350px',
    overflow: 'hidden',
    borderRadius: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
    flexShrink: 0
  },
  cropperImage: {
    position: 'absolute',
    maxWidth: 'none',
    maxHeight: 'none',
    width: 'auto',
    height: 'auto',
    transformOrigin: 'center center',
    transition: 'transform 0.1s ease-out',
    pointerEvents: 'auto'
  },
  circularOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10
  },
  cropOverlaySvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  },
  zoomControlContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    padding: '0 4px',
    flexShrink: 0
  },
  zoomLabel: {
    fontSize: '18px',
    opacity: 0.7
  },
  zoomSlider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    background: 'linear-gradient(to right, #e2e8f0 0%, #3b82f6 100%)',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer'
  },
  cropperActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexShrink: 0,
    paddingTop: '8px'
  },
  cropperCancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  cropperCropButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};
