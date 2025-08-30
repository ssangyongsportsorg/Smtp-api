#!/bin/bash

# SMTP 輪播系統部署腳本
# 此腳本將幫助您快速部署 SMTP 輪播系統

set -e

echo "🚀 SMTP 輪播系統部署腳本"
echo "=========================="

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js"
    exit 1
fi

# 檢查 npm 是否安裝
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝，請先安裝 npm"
    exit 1
fi

echo "✅ Node.js 和 npm 已安裝"

# 檢查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "📝 創建 .env 文件..."
    cp .env.example .env
    echo "⚠️  請編輯 .env 文件並配置您的資料庫連接和其他設定"
    echo "   特別是 DATABASE_URL、JWT_SECRET 和 SESSION_SECRET"
    read -p "按 Enter 繼續..."
else
    echo "✅ .env 文件已存在"
fi

# 安裝依賴
echo "📦 安裝依賴套件..."
npm install

# 生成 Prisma 客戶端
echo "🔧 生成 Prisma 客戶端..."
npm run db:generate

# 檢查資料庫連接
echo "🔍 檢查資料庫連接..."
if npm run db:push &> /dev/null; then
    echo "✅ 資料庫連接成功"
else
    echo "❌ 資料庫連接失敗"
    echo "請檢查您的 DATABASE_URL 設定"
    exit 1
fi

# 創建啟動腳本
echo "📝 創建啟動腳本..."
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 啟動 SMTP 輪播系統..."
npm start
EOF

chmod +x start.sh

# 創建開發腳本
echo "📝 創建開發腳本..."
cat > dev.sh << 'EOF'
#!/bin/bash
echo "🔧 啟動開發模式..."
npm run dev
EOF

chmod +x dev.sh

echo ""
echo "🎉 部署完成！"
echo "=============="
echo ""
echo "📋 下一步："
echo "1. 編輯 .env 文件配置您的設定"
echo "2. 運行 ./start.sh 啟動生產模式"
echo "3. 或運行 ./dev.sh 啟動開發模式"
echo ""
echo "🌐 訪問地址："
echo "- 系統狀態：http://localhost:3000"
echo "- 管理後台：http://localhost:3000/admin"
echo ""
echo "🔐 首次使用："
echo "1. 訪問管理後台註冊第一個管理員帳號"
echo "2. 配置 SMTP 設定"
echo "3. 生成 API key"
echo ""
echo "📚 更多資訊請參考 README.md"