# OaklineBank Mobile App - Quick Start Guide

**Status**: ✅ Ready for Build  
**App**: OaklineBank (com.oakline.bank)  
**Version**: 1.0.0  
**Last Updated**: December 1, 2025

---

## 🎯 What's Done (In Replit)

✅ **Capacitor Framework** - Installed and configured  
✅ **App Icons** - Generated (1024×1024 professional banking logo)  
✅ **Splash Screen** - Generated (2732×2732 with app branding)  
✅ **Configuration Files** - All set up for iOS and Android  
✅ **Store Submission Guides** - Complete checklists for both stores  
✅ **Build Instructions** - Step-by-step guide with troubleshooting  
✅ **Privacy Policy** - Banking-compliant policy ready to publish  
✅ **Documentation** - Icon generation, build process, security setup  

---

## 📱 Next Steps (What You Do Locally)

### Step 1: Download & Install (macOS Only)

```bash
# Clone your Replit project or download as ZIP
# Then locally:
cd oakline-bank
npm install

# Install Xcode (from App Store - required for iOS)
# Install Android Studio (from developer.android.com)
```

### Step 2: Generate Platform-Specific Icons

```bash
# One command generates all iOS + Android icons
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --icon ./resources/icon/icon.png --splash ./resources/splash/splash.png

# This creates:
# - ios/App/App/Assets.xcassets/AppIcon.appiconset/ (all sizes)
# - android/app/src/main/res/mipmap-*/ (all densities)
```

### Step 3: Sync & Build iOS

```bash
# Sync web assets to native projects
npm run capacitor:sync

# Open in Xcode
npm run capacitor:open:ios

# In Xcode:
# 1. Select "App" project → "App" target
# 2. General → Bundle ID: com.oakline.bank
# 3. Signing → Select your Apple Developer team
# 4. Product → Build (⌘B)
# 5. Product → Archive (⌘⇧B)
# 6. Distribute to App Store

# See: BUILD_INSTRUCTIONS.md (iOS section)
```

### Step 4: Build Android

```bash
# Open in Android Studio
npm run capacitor:open:android

# In Android Studio:
# 1. Create signing keystore (one-time)
# 2. Build → Generate Signed Bundle
# 3. Upload AAB to Google Play

# See: BUILD_INSTRUCTIONS.md (Android section)
```

### Step 5: Submit to Stores

**iOS** → App Store Connect  
**Android** → Google Play Console  

See: `APP_STORE_SUBMISSION_GUIDE.md` for complete requirements

---

## 📂 Files & What They Do

```
oakline-bank/
├── resources/
│   ├── icon/
│   │   └── icon.png              ← Professional app icon (1024×1024)
│   └── splash/
│       └── splash.png            ← Loading screen (2732×2732)
├── capacitor.config.ts           ← App configuration
├── capacitor.config.json         ← Backup configuration
├── public/index.html             ← WebView entry point
│
├── 📋 DOCUMENTATION:
├── MOBILE_APP_QUICK_START.md    ← This file - Start here!
├── CAPACITOR_SETUP_GUIDE.md     ← Deep dive on Capacitor setup
├── BUILD_INSTRUCTIONS.md         ← Complete build walkthrough
├── APP_STORE_SUBMISSION_GUIDE.md ← Both stores requirements
├── ICON_GENERATION_GUIDE.md     ← Icon generation details
├── STORE_SUBMISSION_CHECKLIST.md ← Pre-submission checklist
├── PRIVACY_POLICY.md             ← Ready to publish
├── ANDROID_MANIFEST_TEMPLATE.xml ← Reference for Android setup
└── replit.md                      ← Full project documentation
```

---

## 🏗️ Build Pipeline

```
Step 1: Generate Assets
└─ npx capacitor-assets generate
   ├─ iOS icons (8 sizes)
   └─ Android icons (6 densities)

Step 2: Sync Web to Native
└─ npm run capacitor:sync
   ├─ Updates ios/
   └─ Updates android/

Step 3: iOS Build (macOS + Xcode)
└─ Product → Archive
   ├─ Creates .xcarchive
   └─ Exports .ipa
       └─ Upload to App Store Connect

Step 4: Android Build (Android Studio)
└─ Build → Generate Signed Bundle
   ├─ Creates app-release.aab
   └─ Upload to Google Play
```

---

## 📊 Store Requirements Summary

### 🍎 iOS (App Store Connect)

| Requirement | What to Provide |
|-------------|-----------------|
| **Icon** | 1024×1024 PNG |
| **Screenshots** | 2-10 (5.5" display: 1242×2208) |
| **Name** | OaklineBank (30 char max) |
| **Description** | Full 4000-char marketing text |
| **Keywords** | banking, loans, deposits, etc |
| **Privacy Policy** | https://theoaklinebank.com/privacy |
| **Support URL** | https://theoaklinebank.com/support |
| **Min iOS** | 14.0+ |
| **Review Time** | 1-3 days |

### 🤖 Android (Google Play)

| Requirement | What to Provide |
|-------------|-----------------|
| **Icon** | 512×512 PNG |
| **Feature Graphic** | 1024×500 PNG |
| **Screenshots** | 2-8 (6.5" phone: 1440×3120) |
| **Name** | OaklineBank |
| **Description** | Full 4000-char marketing text |
| **Privacy Policy** | https://theoaklinebank.com/privacy |
| **Min Android** | API 24 (Android 7.0) |
| **Target Android** | API 34 (Android 14) |
| **Review Time** | 24-48 hours |

---

## 🔐 Security Checklist

Before submitting to stores:

```
✅ HTTPS only (no HTTP in production)
✅ No hardcoded API keys/secrets
✅ Privacy policy published and linked
✅ WebView loading from HTTPS domain only
✅ No unnecessary permissions requested
✅ Content Security Policy headers set
✅ User data encrypted in transit (TLS 1.3+)
✅ Passwords hashed (bcryptjs)
✅ Database security configured (Row Level Security)
```

---

## 🚀 Timeline

```
Week 1:
├─ Setup Xcode/Android Studio locally
├─ Generate icons and assets
└─ Build test versions (simulator/emulator)

Week 2:
├─ Create App Store Connect app
├─ Create Google Play Console app
├─ Upload screenshots and descriptions
└─ Submit builds to TestFlight + Internal Testing

Week 3:
├─ Monitor App Store review (1-3 days typical)
├─ Monitor Google Play review (24-48 hours typical)
└─ Prepare launch announcement

Week 4:
├─ Apps go live on both stores
└─ Monitor for crashes and reviews
```

---

## 📋 Pre-Launch Checklist

- [ ] Capacitor installed and synced
- [ ] Icons generated for both platforms
- [ ] Splash screens tested on device
- [ ] Website loads correctly in WebView
- [ ] Email notifications working
- [ ] Loan deposit system functioning
- [ ] Privacy policy published
- [ ] Support page active
- [ ] Screenshots captured (5-6 per platform)
- [ ] App description finalized
- [ ] Keywords selected
- [ ] Demo account created (if needed)
- [ ] Apple Developer account $99 paid
- [ ] Google Play $25 registration paid
- [ ] Signing certificates obtained (iOS)
- [ ] Signing keystore created (Android)
- [ ] Version numbers set (1.0.0)
- [ ] Build numbers assigned (1)
- [ ] Content ratings completed
- [ ] TestFlight build passed testing
- [ ] Internal Android testing completed
- [ ] Ready to submit both apps

---

## 🆘 Common Issues & Solutions

### "Module not found" in Xcode
```bash
cd ios/App
pod install
cd ../..
npm run capacitor:sync
```

### "Gradle build failed" in Android
```bash
cd android
./gradlew clean
./gradlew build
cd ..
```

### WebView won't load website
```bash
# Check:
1. Website is accessible (curl -I https://theoaklinebank.com)
2. capacitor.config.ts has correct URL
3. Device has internet connection
4. Firewall allows HTTPS connections
```

### Icons not showing in app
```bash
# Re-generate and sync
npx capacitor-assets generate --icon ./resources/icon/icon.png
npm run capacitor:sync
```

---

## 📞 Resources

- **Capacitor Docs**: https://capacitorjs.com
- **iOS Setup**: https://capacitorjs.com/docs/ios
- **Android Setup**: https://capacitorjs.com/docs/android
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console
- **Build Instructions**: See `BUILD_INSTRUCTIONS.md` (local)
- **Store Requirements**: See `APP_STORE_SUBMISSION_GUIDE.md` (local)

---

## ✅ You're Ready!

All assets, guides, and configurations are prepared. Your next step is to download this project and build locally with Xcode/Android Studio.

**Questions?** Check the detailed guides:
- **Building**: `BUILD_INSTRUCTIONS.md`
- **Stores**: `APP_STORE_SUBMISSION_GUIDE.md`
- **Icons**: `ICON_GENERATION_GUIDE.md`
- **Security**: `ANDROID_MANIFEST_TEMPLATE.xml`

---

**OaklineBank Mobile App v1.0.0**  
*Ready for iOS and Android stores*  
*December 1, 2025*
