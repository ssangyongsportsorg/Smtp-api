#!/bin/bash

# Render 部署準備腳本
# 此腳本將幫助您準備代碼以部署到 Render

set -e

echo "🚀 Render 部署準備腳本"
echo "======================"

# 檢查必要的文件是否存在
echo "📋 檢查必要文件..."

if [ ! -f "package.json" ]; then
    echo "❌ package.json 不存在"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ server.js 不存在"
    exit 1
fi

if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml 不存在"
    exit 1
fi

echo "✅ 所有必要文件都存在"

# 檢查 Node.js 版本
echo "🔍 檢查 Node.js 版本..."
NODE_VERSION=$(node --version)
echo "Node.js 版本: $NODE_VERSION"

# 檢查 npm 版本
echo "🔍 檢查 npm 版本..."
NPM_VERSION=$(npm --version)
echo "npm 版本: $NPM_VERSION"

# 安裝依賴
echo "📦 安裝依賴套件..."
npm install

# 生成 Prisma 客戶端
echo "🔧 生成 Prisma 客戶端..."
npm run db:generate

echo ""
echo "🎉 部署準備完成！"
echo "================"
echo ""
echo "📋 下一步："
echo "1. 將代碼推送到 GitHub"
echo "2. 在 Render Dashboard 中創建 Blueprint"
echo "3. 連接您的 GitHub 倉庫"
echo "4. 點擊 'Apply' 開始部署"
echo ""
echo "📚 詳細步驟請參考 RENDER_DEPLOYMENT.md"
echo ""
echo "⚠️  注意事項："
echo "- 確保您的 GitHub 倉庫是公開的或已連接 Render"
echo "- 部署後記得配置環境變量"
echo "- 首次訪問需要註冊管理員帳號"