#!/bin/bash
# Deploy script for VPS (Ubuntu/Debian)
# Usage: bash deploy.sh

echo "🚀 Deploying Check-in System..."

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install --production
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install
echo "🔨 Building frontend..."
npm run build
cd ..

# Install PM2 globally if not exists
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2
fi

# Start/Restart with PM2
echo "🔄 Starting server with PM2..."
pm2 delete checkin-app 2>/dev/null
pm2 start backend/src/index.js --name checkin-app --env production
pm2 save

echo ""
echo "✅ Deploy complete!"
echo "🌐 App running on port 3001"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status        - Check status"
echo "  pm2 logs          - View logs"
echo "  pm2 restart all   - Restart"
echo ""
echo "💡 To auto-start on reboot: pm2 startup"
