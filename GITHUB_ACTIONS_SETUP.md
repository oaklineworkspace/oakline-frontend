# GitHub Actions Mobile App Build Setup

**Automatic builds without Mac or Windows!** Your GitHub Actions will automatically build iOS and Android apps on every push.

---

## ✅ What's Setup

Two GitHub Actions workflows ready to use:

1. **`build-mobile-ios.yml`** - Builds iOS app (.ipa for TestFlight/App Store)
2. **`build-mobile-android.yml`** - Builds Android app (.aab/.apk for Google Play)

Both workflows:
- Automatically trigger on push to `main` or `develop` branch
- Generate icons and splash screens
- Build production bundles
- Upload artifacts for download

---

## 🚀 Quick Start (5 minutes)

### Step 1: Push Your Project to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/oakline-bank.git
git branch -M main
git push -u origin main
```

### Step 2: Go to GitHub → Actions Tab

Click "Actions" in your GitHub repo - you'll see the workflows running!

### Step 3: Wait for Builds to Complete

- iOS build: ~10-15 minutes
- Android build: ~10 minutes

### Step 4: Download Build Artifacts

After build completes:
1. Click the workflow run
2. Scroll to "Artifacts"
3. Download `.ipa` (iOS) or `.aab`/`.apk` (Android)

---

## 📱 Submitting to App Stores

### iOS App Store (from your iPhone)

1. Download the `.ipa` file from GitHub Actions
2. Go to **App Store Connect** (appstoreconnect.apple.com)
3. Create app entry "OaklineBank"
4. Use **Transporter app** (on Mac or iPad) to upload `.ipa`

**Or use web upload** (easier):
- Log in to App Store Connect
- TestFlight → Builds
- Click "+" to add new build
- Upload `.ipa` file

### Google Play (from your iPhone)

1. Download the `.aab` file from GitHub Actions
2. Go to **Google Play Console** (play.google.com/console)
3. Create app entry "OaklineBank"
4. Upload `.aab` bundle
5. Add screenshots, description, privacy policy
6. Submit for review

---

## 🔐 Setup Signing Keys (Optional - for Auto-Upload)

If you want GitHub to automatically upload to stores, configure these secrets:

### For iOS (TestFlight Auto-Upload)

Go to GitHub → Settings → Secrets and Variables → Actions

Add these secrets:
```
APP_STORE_CONNECT_API_KEY = [your API key]
APP_STORE_CONNECT_API_ISSUER = [your API issuer ID]
```

**Get these from:**
1. App Store Connect → Users and Access → API Keys
2. Create new key with Admin role
3. Copy Key ID and Issuer ID

### For Android (Google Play Auto-Upload)

Go to GitHub → Settings → Secrets and Variables → Actions

Add this secret:
```
ANDROID_KEYSTORE = [base64 encoded keystore.jks]
GOOGLE_PLAY_SERVICE_ACCOUNT = [service account JSON]
```

**Get keystore:**
```bash
# Generate signing key (one-time, on any computer)
keytool -genkey -v -keystore oakline.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias oakline_key

# Encode for GitHub
base64 -i oakline.jks | pbcopy  # macOS
cat oakline.jks | base64 | xclip -selection clipboard  # Linux
```

**Get service account:**
1. Google Play Console → Settings → API access
2. Create Service Account
3. Create JSON key
4. Copy and paste JSON content as secret

---

## 📊 Workflow Status

Check builds anytime:

```
GitHub Repo → Actions tab → Select workflow

Status shows:
✅ Success - Download artifacts
⚠️ Warning - Check logs
❌ Failed - Review error logs
```

---

## 🔄 Manual Trigger (Without Pushing Code)

Go to:
```
Actions → Specific Workflow → Run workflow (dropdown) → Run workflow
```

This rebuilds without code changes.

---

## 📋 Build Process Flow

```
You push code to GitHub
         ↓
GitHub Actions triggers automatically
         ↓
npm install + npm run build
         ↓
Generate icons and splash screens
         ↓
Capacitor sync to native projects
         ↓
Build iOS (.ipa) + Build Android (.aab/.apk)
         ↓
Upload as artifacts (ready to download)
         ↓
(Optional) Auto-upload to TestFlight/Google Play
```

---

## 🎯 For iPhone Users (Like You!)

**Without Mac:**
1. Push code to GitHub
2. GitHub Actions builds in cloud (you wait)
3. Download `.ipa` and `.aab` files
4. Upload to stores using web interface

**That's it! No Mac needed.**

---

## ⚠️ First Time Setup

The workflows might fail the first time because:
- Missing signing credentials (OK - add secrets if needed)
- CocoaPods not installed (GitHub Actions handles it)
- Java/Android SDK issues (usually auto-fixed)

**Just check logs and fix any secrets needed.**

---

## 🚨 Troubleshooting

### Build Failed - iOS

Check logs for:
```
❌ "xcodebuild not found"
✅ Automatically installed on macOS runner

❌ "Signing error"
✅ Add APP_STORE_CONNECT_API_KEY secret

❌ "Pod install failed"
✅ Remove Podfile.lock and retry
```

### Build Failed - Android

Check logs for:
```
❌ "Gradle build failed"
✅ Usually due to Java version - uses Java 17

❌ "Keystore error"
✅ Add ANDROID_KEYSTORE secret (base64 encoded)

❌ "APK not found"
✅ Check build.gradle minSdk/targetSdk versions
```

---

## 📞 Need Help?

1. **Check GitHub Actions logs** - Click workflow run → expand failed step
2. **Read error message carefully** - Usually tells you exactly what's wrong
3. **Verify secrets are set** - GitHub → Settings → Secrets
4. **Rebuild from scratch** - Actions → Workflow → Run workflow

---

## ✨ You're Ready!

Push your code to GitHub and builds happen automatically:

```bash
git add .
git commit -m "Setup mobile app builds"
git push origin main

# Then go to GitHub Actions tab and watch the build!
```

**No Mac. No complex setup. Just push code and get iOS + Android builds!** 🚀

---

**OaklineBank Mobile App** | Cloud Builds with GitHub Actions | December 2025
