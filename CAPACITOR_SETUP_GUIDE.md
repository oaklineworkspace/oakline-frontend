# Capacitor Mobile App Setup for Oakline Bank

## ✅ Completed Setup

Your Capacitor project has been configured to wrap your Vercel website (https://theoaklinebank.com) into native iOS and Android mobile apps.

### What's Been Done

1. **Capacitor Core Installed**
   - `@capacitor/core` - Framework
   - `@capacitor/cli` - Command line tools
   - `@capacitor/ios` - iOS platform
   - `@capacitor/android` - Android platform

2. **Configuration Files Created**
   - `capacitor.config.ts` - TypeScript configuration
   - `capacitor.config.json` - JSON backup configuration
   - `public/index.html` - WebView entry point with loading screen

3. **Project Structure Ready**
   - `/resources/icon/` - For app icons
   - `/resources/splash/` - For splash screens

---

## 🔧 Next Steps (Local Development)

### Prerequisites
- **macOS** (for iOS development)
- **Xcode** (iOS) - Install from App Store
- **Android Studio** (Android) - Download from Google
- **Node.js 16+** and npm

### 1. Initialize Capacitor Project

```bash
# Copy this project locally first, then:
npx cap init "OaklineBank" "com.oakline.bank"
```

### 2. Add Native Platforms

```bash
# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android
```

### 3. Sync Web Assets

```bash
# Copy web app to native projects
npx cap sync
```

### 4. Open in Native IDEs

```bash
# Open iOS project in Xcode
npx cap open ios

# Open Android project in Android Studio
npx cap open android
```

---

## 🎨 App Icons & Splash Screens

### Generate Icons

Place your app icon (1024x1024 PNG) at:
```
resources/icon/icon.png
```

Then generate platform-specific icons:
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --splash --icon ./resources/icon/icon.png
```

This creates:
- iOS: `ios/App/App/Assets.xcassets/`
- Android: `android/app/src/main/res/`

### Custom Splash Screens

1. **iOS** (Xcode):
   - Edit `ios/App/App/Assets.xcassets/Splash.imageset/`
   - Add splash images at 1x, 2x, 3x scale

2. **Android** (Android Studio):
   - Edit `android/app/src/main/res/drawable/splash.xml`
   - Customize colors and images

---

## 📦 Build & Deploy Configuration

### Building for iOS

```bash
# From Xcode
1. Select Product > Build
2. Then Product > Run
3. Or submit to TestFlight/App Store

# Configuration locations:
- App ID: ios/App/App/Info.plist
- Version: Build Settings > Version
- Signing: Build Settings > Signing
```

### Building for Android

```bash
# From Android Studio
1. Build > Make Project
2. Build > Build Bundle(s)/APK(s) > Build APK(s)
3. Upload to Google Play Console

# Configuration locations:
- App ID: android/app/build.gradle
- Version: android/app/build.gradle (versionCode, versionName)
- Signing: android/app/build.gradle (signingConfigs)
```

---

## 🚀 App Store Readiness

### iOS App Store Requirements

1. **App Icon**
   - 1024x1024 PNG (no transparency)
   - Required

2. **Screenshots**
   - 5.5" display (1242x2208 or 1242x2688)
   - Minimum 2 screenshots
   - Maximum 10 screenshots

3. **App Name**
   - Max 30 characters: "OaklineBank"

4. **Subtitle**
   - Max 30 characters: "Mobile Banking"

5. **Description**
   - Max 4000 characters

6. **Keywords**
   - Max 100 characters: "banking, loans, deposits"

7. **Support URL**
   - Required: https://theoaklinebank.com/support

8. **Privacy Policy URL**
   - Required: https://theoaklinebank.com/privacy

9. **Build Settings**
   - Minimum iOS version: 14.0+
   - Devices: Universal (iPhone + iPad)

### Google Play Store Requirements

1. **App Icon**
   - 512x512 PNG
   - Required

2. **Feature Graphics**
   - 1024x500 PNG
   - Required

3. **Screenshots**
   - Minimum 2, Maximum 8
   - Sizes: 1080x1920 or 1440x2560

4. **Short Description**
   - Max 80 characters

5. **Full Description**
   - Max 4000 characters

6. **Content Rating Questionnaire**
   - Required before listing

7. **Privacy Policy URL**
   - Required: https://theoaklinebank.com/privacy

8. **Minimum Android Version**
   - Set to 8.0 (API 26) or higher

---

## 🔐 Security Configuration

### Current Setup

```typescript
// capacitor.config.ts
server: {
  url: 'https://theoaklinebank.com',
  cleartext: true,              // Allows HTTP (development only)
  allowNavigation: ['*']         // Allows all navigation
}
```

### For Production

```typescript
server: {
  url: 'https://theoaklinebank.com',
  cleartext: false,              // Only HTTPS
  allowNavigation: [
    'https://theoaklinebank.com',
    'https://*.theoaklinebank.com'
  ]
}
```

---

## 📋 Build Checklist

- [ ] Icon generated and verified (1024x1024)
- [ ] Splash screen configured
- [ ] App name and description updated
- [ ] Privacy policy URL added
- [ ] Support URL added
- [ ] iOS build settings configured
- [ ] Android build settings configured
- [ ] Signing certificates obtained
- [ ] Version numbers set correctly
- [ ] Screenshots captured
- [ ] Content ratings completed
- [ ] Terms of service accepted
- [ ] Payment/billing information set up (if needed)
- [ ] TestFlight build uploaded (iOS)
- [ ] Internal testing build uploaded (Android)
- [ ] Beta testing completed
- [ ] App Store submission ready
- [ ] Google Play submission ready

---

## 🆘 Troubleshooting

### Issue: "Pod install failed" on iOS
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod repo update
pod install
cd ../..
```

### Issue: Gradle build fails on Android
```bash
cd android
./gradlew clean
./gradlew build
cd ..
```

### Issue: WebView not loading URL
- Check internet connectivity
- Verify `url` in capacitor.config.ts
- Check `allowNavigation` settings
- Ensure CORS headers are correct on web server

### Issue: App crashes on startup
```bash
# Check logs
# iOS: Open Console.app and filter by app name
# Android: adb logcat | grep capacitor
```

---

## 📱 Useful Commands

```bash
# Sync changes to native projects
npx cap sync

# Copy only web assets
npx cap copy

# Update Capacitor plugins
npx cap update

# List installed plugins
npx cap ls

# Run on simulator/emulator
npx cap run ios
npx cap run android

# Open native projects
npx cap open ios
npx cap open android
```

---

## 📞 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com)
- [iOS Deployment Guide](https://capacitorjs.com/docs/ios)
- [Android Deployment Guide](https://capacitorjs.com/docs/android)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)

---

**Your production website URL**: https://theoaklinebank.com
**App ID**: com.oakline.bank
**App Name**: OaklineBank

Ready to build and deploy! 🚀
