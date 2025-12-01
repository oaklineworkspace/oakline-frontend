# OaklineBank Mobile App - Build Instructions

**App ID**: com.oakline.bank  
**Version**: 1.0.0  
**Build Number**: 1

---

## 🏗️ Prerequisites

### For macOS (iOS + Android)
```bash
# Install Xcode (required for iOS)
# Download from App Store or developer.apple.com

# Install Android Studio
# Download from developer.android.com

# Install Node.js 16+ and npm (already installed)
npm --version  # Should be 8+
node --version # Should be 16+
```

### Generate Signing Keys (One-time Setup)

#### iOS - Generate Signing Certificate

1. **In Xcode**:
   - Xcode → Preferences → Accounts
   - Add Apple ID
   - Download signing certificate
   - Select team for code signing

2. **Or Manual**:
```bash
# Create CSR (Certificate Signing Request)
openssl req -new -newkey rsa:2048 -out CertificateSigningRequest.certSigningRequest

# Submit to Apple Developer Portal
# Download certificate, import into Keychain
```

#### Android - Generate Keystore

```bash
# Generate signing key (first time only)
keytool -genkey -v -keystore oakline.jks \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias oakline_key

# Answer prompts:
# Keystore password: [create secure password]
# Key password: [same as keystore password]
# First/Last name: OaklineBank
# Organization: Oakline Bank
# Country: US

# Store oakline.jks securely (back it up!)
# Move to android/app/oakline.jks
```

---

## 🔧 Prepare Web Assets

```bash
# Build Next.js production bundle
npm run build

# Copy to public directory
npm run capacitor:build

# Verify files copied
ls -la public/
```

---

## 📱 iOS Build (.ipa)

### Step 1: Sync Capacitor

```bash
npm run capacitor:sync
```

### Step 2: Open in Xcode

```bash
npm run capacitor:open:ios
```

### Step 3: Configure in Xcode

1. **Select Project** → "App"
2. **Select Target** → "App"
3. **General Tab**:
   - Bundle Identifier: `com.oakline.bank`
   - Version: `1.0.0`
   - Build: `1`
   - Minimum Deployments: `iOS 14.0`

4. **Signing & Capabilities Tab**:
   - Team: Select your Apple Developer Team
   - Bundle Identifier: `com.oakline.bank`
   - Automatic: Check "Automatically manage signing"

5. **Build Settings**:
   - Product Name: `OaklineBank`
   - Bundle Display Name: `OaklineBank`

### Step 4: Verify App Icon

1. **Assets.xcassets** → **AppIcon**
2. Verify all icon sizes present (1024×1024, 180×180, etc.)
3. No warnings in Image Set

### Step 5: Build Archive

1. **Product** → **Build** (⌘B)
   - Wait for build to complete
   - Should show "Build Successful"

2. **Product** → **Archive** (⌘⇧B)
   - Wait for archiving to complete
   - Window should show "Archives"

### Step 6: Export .ipa

1. **Organizer Window**:
   - Select latest build
   - Click **"Distribute App"**

2. **Distribution Options**:
   - Select **"App Store Connect"**
   - Click **"Next"**

3. **Signing**:
   - Select **"Automatically manage signing"**
   - Click **"Next"**

4. **Review**:
   - Verify Bundle ID: `com.oakline.bank`
   - Verify App Version: `1.0.0`
   - Click **"Upload"**

5. **Uploaded!**
   - .ipa is now in App Store Connect
   - Wait 15-30 minutes for processing
   - Will appear under **Testflight** → **Builds**

### TestFlight Testing

```
1. App Store Connect → Testflight → Builds
2. Wait for processing (usually 15-30 minutes)
3. Add Internal Testers (yourself)
4. Send beta link via email
5. Install on physical device/simulator
6. Test all functionality
7. Approve for App Store submission
```

### Submit to App Store

```
1. App Store Connect → Your App → Prepare for Submission
2. Complete all required information (screenshots, description, etc.)
3. Review and confirm pricing/availability
4. Click "Submit for Review"
5. Wait for Apple review (1-3 days typically)
```

---

## 🤖 Android Build (.aab for Play Store)

### Step 1: Sync Capacitor

```bash
npm run capacitor:sync
```

### Step 2: Open in Android Studio

```bash
npm run capacitor:open:android
```

### Step 3: Configure in Android Studio

1. **File** → **Project Structure**

2. **Project**:
   - Gradle JDK: Latest available
   - Default Gradle: Latest available

3. **Modules** → **app**:
   - Min SDK: `24` (Android 7.0)
   - Target SDK: `34` (Android 14)
   - Compile SDK: `34`

4. **build.gradle** (android/app/build.gradle):

```gradle
android {
    namespace 'com.oakline.bank'
    compileSdk 34

    defaultConfig {
        applicationId 'com.oakline.bank'
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName '1.0.0'
    }

    signingConfigs {
        release {
            storeFile file('../oakline.jks')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                'proguard-rules.pro'
        }
    }
}
```

### Step 4: Verify App Icon

1. **res/mipmap-*** directories
2. Verify ic_launcher.png in all folders:
   - mipmap-ldpi (81×81)
   - mipmap-mdpi (108×108)
   - mipmap-hdpi (162×162)
   - mipmap-xhdpi (216×216)
   - mipmap-xxhdpi (324×324)
   - mipmap-xxxhdpi (432×432)

### Step 5: Set Environment Variables

```bash
# Export signing key password (if building locally)
export ANDROID_KEYSTORE_PASSWORD='your_keystore_password'
export ANDROID_KEY_ALIAS='oakline_key'
export ANDROID_KEY_PASSWORD='your_key_password'
```

### Step 6: Build Release Bundle

```bash
# From project root
cd android
./gradlew bundleRelease

# Wait for build to complete (1-2 minutes)
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Step 7: Verify Build

```bash
# Check file exists and size
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# Should be 5-15 MB
```

### Step 8: Upload to Google Play

1. **Google Play Console** → **OaklineBank** (or create new app)

2. **Create Release**:
   - Internal Testing → Create Release
   - Upload `app-release.aab`
   - Review and confirm
   - Release to internal testing

3. **Test with Testers**:
   - Share internal testing link
   - Test on physical devices/emulators
   - Verify app works correctly

4. **Promote to Production**:
   - Create new release with same .aab
   - Add release notes
   - Submit for review

---

## 🔨 Alternative: Direct APK Build

If you need .apk instead of .aab (for direct installation):

```bash
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

**When to use .apk**:
- Direct device installation
- Testing before Play Store upload
- Alternative distribution

**When to use .aab** (Recommended):
- Google Play Store submission
- Smaller file size per device
- Better compression

---

## 📦 Build Artifacts Location

### iOS
```
~/Library/Developer/Xcode/Archives/
└── [Date] [Time] App.xcarchive
```

**Exported .ipa** (after distribution):
```
Submitted to App Store Connect
Automatically signed and ready
```

### Android
```
android/app/build/outputs/
├── bundle/
│   └── release/
│       └── app-release.aab  ← Upload to Play Store
└── apk/
    └── release/
        └── app-release.apk  ← Direct install / testing
```

---

## ✅ Verification Checklist

### Before iOS Build
- [ ] App icons in place (all sizes)
- [ ] Bundle ID: `com.oakline.bank`
- [ ] Version: `1.0.0`
- [ ] Build: `1`
- [ ] Deployment target: iOS 14+
- [ ] Signing team selected
- [ ] No build errors
- [ ] Simulator test successful

### Before Android Build
- [ ] App icons in place (all densities)
- [ ] Package name: `com.oakline.bank`
- [ ] Version Code: `1`
- [ ] Version Name: `1.0.0`
- [ ] Min SDK: `24`
- [ ] Target SDK: `34`
- [ ] Signing keystore present
- [ ] No build errors
- [ ] Emulator test successful

### Before Submission
- [ ] Screenshots ready (5-6 per platform)
- [ ] App description finalized
- [ ] Privacy policy URL set
- [ ] Support URL set
- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] All permissions justified
- [ ] WebView security verified

---

## 🐛 Troubleshooting

### iOS Build Fails

**Error**: "CodeSign error"
```bash
# Solution: Reset signing
xcode-select --reset
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

**Error**: "Pod install failed"
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod repo update
pod install
cd ../..
```

**Error**: "Provisioning profile error"
```
Xcode → Preferences → Accounts
Delete and re-add Apple ID
Download all profiles
```

### Android Build Fails

**Error**: "Gradle build failed"
```bash
cd android
./gradlew clean
./gradlew build
```

**Error**: "Signing key not found"
```bash
# Verify keystore exists
ls -la android/app/oakline.jks

# Verify passwords in environment
echo $ANDROID_KEYSTORE_PASSWORD
```

**Error**: "APK installation fails"
```bash
# Check app not already installed
adb uninstall com.oakline.bank

# Then try again
adb install android/app/build/outputs/apk/release/app-release.apk
```

### WebView Doesn't Load

**Issue**: "Website won't load in app"

**Check**:
1. Internet connection active
2. capacitor.config.ts has correct URL
3. URL is HTTPS (not HTTP)
4. Firewall allows requests
5. Device can access website manually

```bash
# Verify on device
curl -I https://theoaklinebank.com
```

---

## 🚀 Release Checklist

- [ ] Both builds (.ipa and .aab) created successfully
- [ ] No build warnings or errors
- [ ] Version numbers match (1.0.0)
- [ ] Icons present and correct
- [ ] App Store Connect filled completely
- [ ] Google Play Console filled completely
- [ ] TestFlight testing complete
- [ ] Internal Android testing complete
- [ ] Privacy policy published
- [ ] Support page set up
- [ ] App Store submission sent
- [ ] Google Play submission sent
- [ ] Review status monitored daily
- [ ] App approved and published

---

*Build Instructions for OaklineBank v1.0.0*  
*December 1, 2025*
