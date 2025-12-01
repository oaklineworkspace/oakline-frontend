#!/bin/bash
# OaklineBank Mobile App - Final Local Setup Script
# Run this after downloading the project to your Mac

echo "🍎 OaklineBank Mobile App Setup"
echo "======================================"

# Install dependencies
npm install

# Generate icons (requires @capacitor/assets installed)
echo "📱 Generating app icons..."
npx capacitor-assets generate

# Sync to native projects
echo "🔄 Syncing to iOS and Android..."
npm run capacitor:sync

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. For iOS:     npm run capacitor:open:ios"
echo "2. For Android: npm run capacitor:open:android"
echo ""
echo "See MOBILE_APP_QUICK_START.md for detailed instructions"
