# App Store Submission Guide - OaklineBank

**App ID**: com.oakline.bank  
**App Name**: OaklineBank  
**Website**: https://theoaklinebank.com  
**Release Date**: December 2025

---

## 📱 iOS App Store Connect Setup

### 1. Basic Information

**App Name**: OaklineBank  
**Bundle ID**: com.oakline.bank  
**SKU**: OAKLINEBANK001  
**Primary Language**: English

### 2. iOS Deployment Target

In Xcode (required):
```
Build Settings → Minimum Deployments
iOS Deployment Target: 14.0 or later
```

**Why iOS 14?**
- WebView security improvements
- Modern device support
- App Store minimum requirement

### 3. App Icons

**Location in Xcode**:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

**Required Sizes**:
- 1024 × 1024 px (App Store)
- 180 × 180 px (iPhone Spotlight)
- 167 × 167 px (iPad Pro Spotlight)
- 152 × 152 px (iPad Spotlight)
- 120 × 120 px (iPhone Spotlight)
- 87 × 87 px (iPhone Spotlight)
- 80 × 80 px (iPad Spotlight)
- 58 × 58 px (iPhone Spotlight)

**App Icon Specs**:
- PNG format (no transparency required for banking app)
- No rounded corners (iOS adds automatically)
- Flat design, no gradients recommended
- Safe zone: center 60% of image

### 4. Splash Screen

**Location in Xcode**:
```
ios/App/App/Storyboard/SplashScreen.storyboard
```

**Recommended Setup**:
- Centered app logo (512×512)
- App name "OaklineBank" below logo
- Green color scheme (#059669)
- No required text (optional company name)

### 5. App Description & Metadata

**App Name** (30 char max):
```
OaklineBank
```

**Subtitle** (30 char max):
```
Mobile Banking Made Simple
```

**Full Description** (4000 char max):
```
OaklineBank brings secure, fast, and professional banking to your fingertips.

Key Features:
• Apply for loans with transparent terms
• Submit 10% collateral deposits via cryptocurrency or bank transfer
• Track deposit verification in real-time
• Manage accounts and view transaction history
• Instant email notifications for all transactions
• Professional receipt generation and download
• Support for Bitcoin, Ethereum, USDC, USDT

Security:
• Supabase authentication with encrypted passwords
• HTTPS-only secure connections
• Row-level database security
• PCI-compliant architecture

Perfect for individuals seeking quick, secure, transparent loans with modern payment options.

Disclaimer: OaklineBank is a financial services platform. Users must comply with all applicable banking regulations in their jurisdiction.
```

**Promotional Text** (170 char max):
```
Fast loans with cryptocurrency deposits. Bank securely from your phone.
```

**Keywords** (100 char max):
```
banking, loans, deposits, cryptocurrency, finance, mobile banking
```

### 6. Support & Privacy URLs

**Support URL**:
```
https://theoaklinebank.com/support
```

**Privacy Policy URL**:
```
https://theoaklinebank.com/privacy
```

**Terms & Conditions URL** (if applicable):
```
https://theoaklinebank.com/terms
```

### 7. Screenshots

**Sizes**: iPhone 6.7" (2796 × 1290 px)

**Recommended Screenshots**:
1. **Welcome Screen** - Show app branding
2. **Login/Registration** - Security features highlighted
3. **Loan Dashboard** - Main feature showcase
4. **Deposit Page** - Payment options visible
5. **Receipt** - Professional confirmation

**Formatting**:
- Minimum 2 screenshots, maximum 10
- PNG format
- No mockups or frames
- Focus on key features
- Use readable fonts (minimum 11pt)

### 8. Compliance Questions

**Content Rights**:
- Does this app use cryptography? **YES**
  - Reason: HTTPS/TLS for all transactions
  
**Financial Transactions**:
- Does this app facilitate financial transactions? **YES**
  - Include: App ID, company name, jurisdiction
  
**Medical/Health**:
- Any medical information? **NO**

**Kids Category**:
- Is this app designed for kids? **NO**

**Gambling**:
- Does this app involve gambling/lotteries? **NO**

**Data & Privacy**:
- Do you use IDFA? **NO**
- Do you track users? **Only necessary for authentication**

### 9. App Store Connect Settings

**App Review Information**:
- **Contact Email**: support@theoaklinebank.com
- **Contact Phone**: [Your support number]
- **Demo Account** (if needed):
  - Email: demo@theoaklinebank.com
  - Password: [Demo password - update this]
  - Notes: This is a test account for WebView access verification

**Version Release**:
- **Version Number**: 1.0.0
- **Build Number**: 1
- **Release Date**: Manual release or Automatic
- **Build for Testing**: Enable for TestFlight

### 10. Configuration in Code

**Info.plist** (Xcode):
```xml
<key>CFBundleIdentifier</key>
<string>com.oakline.bank</string>

<key>CFBundleVersion</key>
<string>1</string>

<key>CFBundleShortVersionString</key>
<string>1.0.0</string>

<key>CFBundleName</key>
<string>OaklineBank</string>

<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>theoaklinebank.com</key>
    <dict>
      <key>NSIncludesSubdomains</key>
      <true/>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <false/>
      <key>NSExceptionMinimumTLSVersion</key>
      <string>TLSv1.2</string>
    </dict>
  </dict>
</dict>

<key>NSBonjourServices</key>
<array/>

<key>NSLocalNetworkUsageDescription</key>
<string>OaklineBank requires local network access for secure transactions.</string>

<key>NSPrivacyTracking</key>
<false/>

<key>NSPrivacyTrackingDomains</key>
<array/>
```

### 11. Testing on TestFlight

1. **Create Build** in Xcode → Product → Archive
2. **Export Signed Archive**
3. **Upload to App Store Connect**
4. **Wait for processing** (usually 15-30 minutes)
5. **Add TestFlight testers** (up to 10,000 internal/external)
6. **Test thoroughly** before App Store submission

---

## 🤖 Google Play Store Submission

### 1. Basic Information

**App Name**: OaklineBank  
**App ID**: com.oakline.bank  
**Category**: Finance  
**Content Rating**: General Audiences

### 2. Android Permissions Review

**Required AndroidManifest.xml Permissions**:

```xml
<!-- Internet access for WebView and API calls -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Verify WebView functionality -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- (Optional) Deep linking and web intents -->
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
```

**Dangerous Permissions** (None required - WebView handles most):
- Camera: Only request if needed for ID verification
- Location: Not required
- Contacts: Not required

### 3. Android Target API

**build.gradle** (android/app/):
```gradle
android {
    compileSdk 34  // Latest Android 14
    
    defaultConfig {
        targetSdkVersion 34  // Required for new Play Store uploads
        minSdkVersion 24     // Android 7.0+
        
        versionCode 1
        versionName "1.0.0"
    }
}
```

### 4. App Icons

**Location**:
```
android/app/src/main/res/
├── mipmap-ldpi/
├── mipmap-mdpi/
├── mipmap-hdpi/
├── mipmap-xhdpi/
├── mipmap-xxhdpi/
└── mipmap-xxxhdpi/
```

**Required Sizes**:
| Density | Size |
|---------|------|
| LDPI | 81 × 81 px |
| MDPI | 108 × 108 px |
| HDPI | 162 × 162 px |
| XHDPI | 216 × 216 px |
| XXHDPI | 324 × 324 px |
| XXXHDPI | 432 × 432 px |

**Filename**: `ic_launcher.png`

### 5. Feature Graphics

**Size**: 1024 × 500 px  
**Format**: PNG or JPG  
**Content**:
- App branding/logo
- App name "OaklineBank"
- Key feature highlights
- Professional banking aesthetic

### 6. App Icons (Play Store Listing)

**Play Store Icon** (512 × 512 px):
- Same design as app icon
- PNG format
- White background

### 7. Screenshots

**Phone Screenshots** (6.5" phone - 1440 × 3120 px):

**Minimum**: 2 screenshots  
**Maximum**: 8 screenshots  
**Recommended**: 5-6 screenshots

**Screenshot Sequence**:
1. **App Welcome** - "Banking Made Simple"
2. **Dashboard** - Account overview
3. **Loan Deposit** - Key feature
4. **Transaction History** - Trust/transparency
5. **Receipt/Confirmation** - Professional design
6. **Security Features** - Encryption/safety

**Format**: PNG or JPG, portrait orientation

### 8. App Description

**Short Description** (80 char max):
```
Secure mobile banking with cryptocurrency deposit support
```

**Full Description** (4000 char max):
```
Welcome to OaklineBank - your secure gateway to modern banking.

WHAT WE OFFER
• Fast loan applications with transparent approval process
• Submit 10% collateral deposits via cryptocurrency (Bitcoin, Ethereum, USDC, USDT)
• Alternative bank transfer deposit methods
• Real-time blockchain confirmation tracking
• Instant deposit verification notifications
• Professional receipt generation and download

SECURITY FIRST
✓ Enterprise-grade encryption (TLS 1.3+)
✓ Secure Supabase authentication
✓ Password hashing with bcryptjs
✓ Row-level database security
✓ No data collection for ads/tracking
✓ Open privacy policy

FEATURES
• Multiple account types (Checking, Savings, Money Market)
• Instant transaction history
• Email notifications for all activities
• Support for major cryptocurrencies
• Professional mobile interface
• Responsive design for all devices

PERMISSIONS
• Internet - Required for banking transactions
• Network Access - Required to verify connection

LEGAL
This app is a financial services platform. Use requires compliance with all applicable banking regulations in your jurisdiction. Please review our Privacy Policy and Terms of Service.

Support: support@theoaklinebank.com
Website: https://theoaklinebank.com
```

**Marketing Opt-in**:
- Enable "Display rating request"
- Enable "Display app update request"

### 9. Content Rating (IARC)

**Category**: Finance  
**Age Rating**: General Audiences

**Questionnaire Responses**:
- Financial Information: YES (banking)
- Personal Information: YES (authentication)
- Health Information: NO
- Location Information: NO
- Ads or Third-party Services: NO
- Unrestricted Internet: YES (WebView)

### 10. Privacy Policy

**Required URL**:
```
https://theoaklinebank.com/privacy
```

**Must Include**:
- Data collection practices
- User rights
- Data retention policy
- User deletion/export process
- Contact information
- Cookie policy
- Third-party services (Stripe, Supabase, etc.)

### 11. Build Configuration

**build.gradle** (android/app/):
```gradle
android {
    signingConfigs {
        release {
            storeFile file("keystore.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 12. Generate Play Store Build

```bash
# 1. Generate signing key (one-time)
keytool -genkey -v -keystore keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias oakline_key

# 2. Build release bundle
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 13. Submitting to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app "OaklineBank"
3. Fill in app details (all sections above)
4. Upload **app-release.aab** file
5. Add content rating questionnaire
6. Accept policies
7. Submit for review

**Review Time**: Usually 24-48 hours

---

## 🔐 WebView Security Requirements

### iOS Requirements (App Store Compliance)

✅ **HTTPS Only**
```
allowNavigation: ['https://theoaklinebank.com']
```

✅ **Certificate Pinning** (Recommended)
- Pin SSL certificate for theoaklinebank.com
- Implement via Capacitor security plugin

✅ **Disable User Agent Spoofing**
```typescript
server: {
  allowNavigation: ['https://theoaklinebank.com'],
  userAgentStrategyios: 'append'
}
```

### Android Requirements (Play Store Compliance)

✅ **Minimum Android Version**
- API 24 (Android 7.0) minimum
- API 34 (Android 14) target

✅ **Security Settings**
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Allow only HTTPS -->
<domain-config cleartextTrafficPermitted="false">
  <domain includeSubdomains="true">theoaklinebank.com</domain>
</domain-config>
```

✅ **WebView Updates**
- Update WebView via Google Play
- Automatic security patches

### General WebView Security

✅ **Disable Dangerous APIs**
```typescript
// capacitor.config.ts
ios: {
  limitsNavigationsToAppBoundDomains: true
}
```

✅ **Content Security Policy**
Add to your website headers:
```
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline'
```

✅ **Remove Debugging APIs**
```typescript
server: {
  cleartext: false  // Production only
}
```

---

## 📋 Pre-Submission Checklist

### General
- [ ] App icon (1024×1024) created and verified
- [ ] Splash screen (2732×2732) created and verified
- [ ] App name, description, keywords finalized
- [ ] Privacy policy URL set up and accessible
- [ ] Support URL set up and accessible
- [ ] Screenshots captured (min 2, max 10 per platform)
- [ ] Version numbers set (1.0.0)
- [ ] Build numbers set (1 for iOS, 1 for Android)

### iOS (App Store Connect)
- [ ] Apple Developer account created
- [ ] Paid Developer Program membership active ($99/year)
- [ ] Signing certificate obtained
- [ ] Provisioning profile created
- [ ] Bundle ID registered (com.oakline.bank)
- [ ] App created in App Store Connect
- [ ] Info.plist configured correctly
- [ ] Deployment target set to iOS 14+
- [ ] TestFlight build uploaded and tested
- [ ] Demo account provided (if needed)
- [ ] Content rating completed
- [ ] Age restriction set (4+)
- [ ] EULA accepted
- [ ] App Review Information completed
- [ ] Build submitted to App Store

### Android (Google Play Console)
- [ ] Google Play Developer account created
- [ ] $25 registration fee paid (one-time)
- [ ] Signing keystore created (keystore.jks)
- [ ] Build uploaded (.aab file)
- [ ] App details completed (name, description, etc.)
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL provided
- [ ] Screenshots uploaded (5-6 minimum)
- [ ] Feature graphics uploaded (1024×500)
- [ ] App icon uploaded (512×512)
- [ ] Permissions reviewed
- [ ] Target SDK set to 34+
- [ ] Build signed and ready
- [ ] Internal testing completed
- [ ] App submitted for review

### Security & Compliance
- [ ] HTTPS enforced for all URLs
- [ ] No hardcoded API keys or secrets
- [ ] Environment variables used for sensitive data
- [ ] Privacy policy addresses data collection
- [ ] Terms of service accessible
- [ ] No tracking pixels or analytics (if claimed)
- [ ] WebView security configured
- [ ] Content Security Policy headers set
- [ ] Cryptography disclosures completed (iOS)

---

## 🚀 Timeline

**Week 1**: Prepare assets, create listings, test on TestFlight/internal
**Week 2**: Submit to App Store, begin Google Play review process
**Week 3**: App Store review (typically 1-3 days)
**Week 4**: Google Play review (typically 24-48 hours)
**Week 5**: Live on both stores

---

## 📞 Support Resources

- **Apple App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console
- **Capacitor iOS Docs**: https://capacitorjs.com/docs/ios
- **Capacitor Android Docs**: https://capacitorjs.com/docs/android
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies**: https://play.google.com/about/developer-content-policy/

---

*Generated December 1, 2025*  
*OaklineBank Mobile App v1.0.0*
