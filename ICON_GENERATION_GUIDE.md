# Icon & Splash Screen Generation Guide

## Generated Assets

### Main App Icon
**Location**: `resources/icon/icon.png`  
**Size**: 1024 × 1024 px  
**Format**: PNG  
**Use**: Base for all platform-specific sizes

### Splash Screen
**Location**: `resources/splash/splash.png`  
**Size**: 2732 × 2732 px  
**Format**: PNG  
**Use**: Loading screen during app startup

---

## 🍎 iOS Icon Setup

### Automatic Generation (Recommended)

```bash
# Install assets generator
npm install --save-dev @capacitor/assets

# Generate all iOS icons from base image
npx capacitor-assets generate --splash --icon ./resources/icon/icon.png
```

This automatically creates:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
├── Icon-20.png
├── Icon-20@2x.png
├── Icon-20@3x.png
├── Icon-60@2x.png
├── Icon-60@3x.png
├── Icon-1024.png
└── Contents.json (metadata)
```

### Manual Setup (If needed)

**Required iOS Icon Sizes**:

| Size | Name | Devices |
|------|------|---------|
| 1024×1024 | Icon-1024.png | App Store |
| 180×180 | Icon-60@3x.png | iPhone 6s+ |
| 167×167 | Icon-83.5@2x.png | iPad Pro |
| 152×152 | Icon-76@2x.png | iPad |
| 120×120 | Icon-60@2x.png | iPhone 6, 7, 8 |
| 87×87 | Icon-29@3x.png | Spotlight |
| 80×80 | Icon-40@2x.png | Spotlight |
| 58×58 | Icon-29@2x.png | Spotlight |

**Steps**:
1. Use image editor to resize `resources/icon/icon.png` to each size
2. Save each as PNG (no transparency)
3. Place in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
4. In Xcode, verify in Asset Catalog

---

## 🤖 Android Icon Setup

### Automatic Generation (Recommended)

```bash
npx capacitor-assets generate --icon ./resources/icon/icon.png
```

This creates:
```
android/app/src/main/res/
├── mipmap-ldpi/ic_launcher.png (81×81)
├── mipmap-mdpi/ic_launcher.png (108×108)
├── mipmap-hdpi/ic_launcher.png (162×162)
├── mipmap-xhdpi/ic_launcher.png (216×216)
├── mipmap-xxhdpi/ic_launcher.png (324×324)
└── mipmap-xxxhdpi/ic_launcher.png (432×432)
```

### Manual Setup (If needed)

**Required Android Icon Sizes**:

| Density | Size | Path |
|---------|------|------|
| LDPI | 81 × 81 | mipmap-ldpi/ |
| MDPI | 108 × 108 | mipmap-mdpi/ |
| HDPI | 162 × 162 | mipmap-hdpi/ |
| XHDPI | 216 × 216 | mipmap-xhdpi/ |
| XXHDPI | 324 × 324 | mipmap-xxhdpi/ |
| XXXHDPI | 432 × 432 | mipmap-xxxhdpi/ |

**Filename**: `ic_launcher.png` (all directories)

---

## 🎨 Splash Screen

### iOS Splash Screen

**Location**: `ios/App/App/Storyboard/SplashScreen.storyboard`

**Setup in Xcode**:
1. Open project in Xcode
2. Select `SplashScreen.storyboard`
3. Add Image View
4. Set image to 512×512 logo
5. Center on screen
6. Set background to green (#059669)
7. Add app name label below logo

**Recommended Size**: 2732×2732 px (3x scale)

### Android Splash Screen

**Location**: `android/app/src/main/res/drawable/splash.xml`

**Edit splash.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Background color -->
    <item android:drawable="@color/splash_bg"/>
    
    <!-- Logo image -->
    <item
        android:drawable="@drawable/splash_logo"
        android:gravity="center"/>
</layer-list>
```

**Create splash_logo.png**:
- Size: 512×512 px
- Place in: `android/app/src/main/res/drawable/`

---

## 🚀 Automated Asset Generation

### One-Command Generation

```bash
# Generate all icons and splash screens at once
npx capacitor-assets generate \
  --icon ./resources/icon/icon.png \
  --splash ./resources/splash/splash.png
```

**Output**:
- iOS: `ios/App/App/Assets.xcassets/`
- Android: `android/app/src/main/res/`

### Verify Generation

```bash
# Check iOS
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Check Android
ls -la android/app/src/main/res/mipmap-*/ic_launcher.png
```

---

## 📋 Checklist

- [ ] `resources/icon/icon.png` created (1024×1024)
- [ ] `resources/splash/splash.png` created (2732×2732)
- [ ] `@capacitor/assets` installed
- [ ] Generated iOS icons in place
- [ ] Generated Android icons in place
- [ ] Verified all icon sizes present
- [ ] Tested in iOS simulator
- [ ] Tested in Android emulator
- [ ] No missing icon warnings in builds

---

## 📸 Screenshot Preparation

### iOS Screenshots (6.7" display: 2796×1290)

Create in Xcode simulator:
```bash
# Open iOS project
npm run capacitor:open:ios

# Run on iPhone 14 Pro Max simulator
# Take screenshots (⌘S)
```

### Android Screenshots (6.5" phone: 1440×3120)

Create in Android emulator:
```bash
# Open Android project
npm run capacitor:open:android

# Run on emulator
# Take screenshot via Android Studio
```

---

## 🎯 Quick Commands

```bash
# Install assets tool
npm install --save-dev @capacitor/assets

# Generate all assets
npx capacitor-assets generate --icon ./resources/icon/icon.png --splash ./resources/splash/splash.png

# Sync to native projects
npm run capacitor:sync

# Verify setup
npm run capacitor:build

# Open in IDEs
npm run capacitor:open:ios
npm run capacitor:open:android
```

---

*Icon Generation Guide for OaklineBank v1.0.0*
