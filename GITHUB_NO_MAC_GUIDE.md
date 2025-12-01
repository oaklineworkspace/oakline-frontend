# Build & Submit Mobile Apps Without Mac - Complete Guide

**iPhone only? No problem!** Complete guide to building, submitting, and deploying without Mac/Windows.

---

## 🎯 Overview

```
Your Code (GitHub)
    ↓
GitHub Actions (Cloud Mac)
    ↓
Build iOS + Android
    ↓
Download .ipa and .aab files
    ↓
Submit to App Stores (via web)
    ↓
Live on App Store & Google Play
```

**No Mac required. Everything works from iPhone or iPad!**

---

## 📱 Step-by-Step for iPhone Users

### Phase 1: Push Code to GitHub (5 min)

```bash
# On any computer (or use GitHub web interface):
git remote add origin https://github.com/YOUR_USERNAME/oakline-bank.git
git branch -M main
git push -u origin main
```

### Phase 2: Watch GitHub Actions Build (15-20 min)

1. Open GitHub repo in Safari
2. Click "Actions" tab
3. See workflows building
4. Wait for "Build iOS App" and "Build Android App" to complete

### Phase 3: Download Build Files (1 min)

1. Click completed workflow
2. Scroll to "Artifacts"
3. Download:
   - `OaklineBank.ipa` (iOS)
   - `OaklineBank-release.aab` (Android)

### Phase 4: Upload to App Stores

#### For iOS (App Store)

**Option A: Using App Store Connect Web**
1. Go to appstoreconnect.apple.com
2. Sign in with Apple ID
3. Apps → OaklineBank → TestFlight → Builds
4. Click "+" → Upload build
5. Upload the `.ipa` file

**Option B: Using Transporter (iPad/iPhone)**
1. Download "Transporter" app from App Store
2. Sign in with Apple ID
3. Click "+"
4. Select `.ipa` file from downloads
5. Click "Deliver"

**Processing**:
- Takes 15-30 minutes to process
- Then appears in TestFlight for testing
- After testing, submit for App Store review (1-3 days)

#### For Android (Google Play)

**Using Google Play Console (web)**
1. Go to play.google.com/console
2. Sign in with Google account
3. Create app "OaklineBank"
4. Internal Testing → Create Release
5. Upload `.aab` file
6. Fill app details:
   - Add description from APP_STORE_SUBMISSION_GUIDE.md
   - Add 5-6 screenshots
   - Add privacy policy URL
7. Submit for review (24-48 hours)

---

## 🚀 Automation Tips

### Auto-Trigger Builds on Code Push

Currently, workflows trigger automatically when you:
```
git push origin main
```

Every time you update code, new builds start automatically! 🎉

### Manual Rebuild (Without Code Changes)

1. GitHub → Actions
2. Select "Build iOS App" or "Build Android App"
3. Click "Run workflow" dropdown
4. Click "Run workflow"

---

## 📋 Required Information for App Stores

### For Both Stores

You'll need (copy from documentation):

```
App Name: OaklineBank
Package ID: com.oakline.bank
Description: [See APP_STORE_SUBMISSION_GUIDE.md]
Keywords: banking, loans, cryptocurrency
Privacy Policy URL: https://theoaklinebank.com/privacy
Support URL: https://theoaklinebank.com/support
```

### iOS Additional

- Minimum iOS: 14.0+
- Screenshots: 5.5" display (1242×2208)
- Age Rating: 4+
- Demo account (optional)

### Android Additional

- Minimum Android: API 24 (Android 7.0)
- Screenshots: 6.5" phone (1440×3120)
- Feature Graphic: 1024×500 PNG
- Content Rating: General Audiences

---

## 🎬 Example Timeline

```
Monday 9:00 AM
├─ Push code: git push origin main
│
Monday 9:05 AM
├─ GitHub Actions starts building
│
Monday 9:20 AM
├─ iOS build done (.ipa ready)
├─ Android build done (.aab ready)
│
Monday 9:25 AM
├─ Download .ipa and .aab files
│
Monday 9:30 AM
├─ Upload .ipa to App Store Connect
├─ Upload .aab to Google Play Console
│
Tuesday 9:00 AM
├─ iOS ready in TestFlight (if submitted)
│
Wednesday 2:00 PM
├─ iOS approved by App Store ✅
├─ Android approved by Google Play ✅
│
Both apps live on stores! 🎉
```

---

## 💡 Pro Tips

### Tip 1: Use Screenshots from Simulator

Even without Mac, you can:
1. Find online iPhone simulator (search "iPhone 15 simulator online")
2. Take screenshots of your app running
3. Edit in Photos app
4. Use for app store

### Tip 2: Upload Multiple Builds

You can upload different builds to:
- **TestFlight** (internal testing first)
- **Google Play Internal Testing** (before public release)
- **App Store** (final production)

### Tip 3: Monitor Build Status

Get GitHub notifications:
1. GitHub Settings → Notifications
2. Enable "Actions"
3. Receive email when builds complete

### Tip 4: Use Drafts to Queue Submissions

Write app descriptions in Notes app, then copy to stores when ready.

---

## ⚠️ Common Issues & Fixes

### "Build Failed - No artifacts"

**Cause**: Workflow didn't complete  
**Fix**: 
- Check GitHub Actions logs
- Look for error messages
- Common: Node version, Java version

**Solution**:
- Workflows already specify correct versions
- If fails, try: Actions → Workflow → Run workflow (manual)

### "Can't find .ipa file to download"

**Cause**: iOS build failed  
**Fix**:
- Click workflow → "Build iOS App" step
- Scroll down for error message
- Common: CocoaPods, Xcode version

**Check logs for**:
```
❌ "xcodebuild failed"
✅ Try manual rebuild

❌ "Pod install error"  
✅ Remove Podfile.lock from iOS folder
```

### "App Store says invalid build"

**Cause**: Signing issue  
**Fix**:
- Re-download fresh build from GitHub Actions
- Make sure it's the latest version
- Try uploading via Transporter instead of web

### "Google Play says APK/AAB not signed"

**Cause**: Signing credentials missing  
**Fix**: This is normal for first build
- Just use the .aab file (not .apk)
- .aab is signed automatically by Google Play

---

## 🔒 Security Notes

### Sensitive Files (Gitignore)

These are already ignored (don't push):
```
node_modules/
.env
.env.local
*.jks          ← Signing keys
.next/
ios/Pods/
android/.gradle/
```

### Protect Your Secrets

GitHub stores secrets securely:
- API keys never shown in logs
- Only workflow jobs can access
- Safe to use for auto-uploads

---

## 📞 Resources

**App Store Connect**: https://appstoreconnect.apple.com  
**Google Play Console**: https://play.google.com/console  
**GitHub Actions Docs**: https://docs.github.com/en/actions  
**Capacitor iOS Docs**: https://capacitorjs.com/docs/ios  
**Capacitor Android Docs**: https://capacitorjs.com/docs/android  

---

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] GitHub Actions workflows running
- [ ] Builds completed successfully
- [ ] .ipa and .aab files downloaded
- [ ] App Store Connect account created
- [ ] Google Play Console account created
- [ ] App entries created in both stores
- [ ] Screenshots prepared
- [ ] Descriptions filled in
- [ ] Privacy policy linked
- [ ] Builds uploaded to stores
- [ ] Apps submitted for review

---

## 🎉 You're Done!

From now on:
1. Update code locally or in GitHub web editor
2. `git push` or commit directly to GitHub
3. GitHub Actions builds automatically
4. Download builds and submit to stores

**All from your iPhone. No Mac needed.** 🚀

---

**OaklineBank Mobile App** | iPhone, iPad, or Browser - Zero Mac Required | December 2025
