# 🚀 SMTP 輪播系統 - 快速開始指南

## 概述

這是一個具有管理員認證和 API 密鑰管理功能的 SMTP 輪播系統，支持 PostgreSQL 數據庫和電子郵件發送。

## 🔧 系統要求

- Node.js 16+ 
- PostgreSQL 12+
- npm 或 yarn

## ⚡ 快速設置

### 1. 安裝依賴
```bash
npm install
```

### 2. 配置環境變數
複製並編輯 `.env` 文件：
```bash
cp .env.example .env
```

更新數據庫連接：
```env
DATABASE_URL="postgresql://username:password@localhost:5432/smtp_rotation_db?schema=public"
```

### 3. 設置數據庫
```bash
# 生成 Prisma 客戶端
npm run db:generate

# 推送數據庫架構
npm run db:push
```

### 4. 啟動應用
```bash
# 開發模式
npm run dev

# 或生產模式
npm start
```

## 🎯 首次使用

### 1. 訪問管理後台
打開瀏覽器，訪問：`http://localhost:3000/admin`

### 2. 登入管理員帳號
- **用戶名**: `admin`
- **密碼**: `admin123`

⚠️ **重要**: 首次登入後請立即更改密碼！

### 3. 配置 SMTP
在管理後台 "SMTP 配置" 標籤中：
1. 點擊 "新增 SMTP"
2. 填寫 SMTP 服務器資訊：
   ```
   名稱: Gmail SMTP
   主機: smtp.gmail.com
   端口: 587
   用戶名: your-email@gmail.com
   密碼: your-app-password
   月配額: 10000
   ```

### 4. 創建 API 密鑰
在 "API 密鑰" 標籤中：
1. 點擊 "新增 API 密鑰"
2. 填寫資訊：
   ```
   密鑰名稱: 測試 API
   最大使用次數: 1000 (可選)
   到期時間: (可選)
   ```
3. 保存後複製生成的 API 密鑰

## 📧 發送郵件

### 使用 API
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -d '{
    "to": "recipient@example.com",
    "subject": "測試郵件",
    "text": "這是純文本內容",
    "html": "<h1>Hello World</h1><p>這是 HTML 郵件</p>"
  }'
```

### JavaScript 範例
```javascript
const response = await fetch('http://localhost:3000/api/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY_HERE'
  },
  body: JSON.stringify({
    to: 'recipient@example.com',
    subject: '測試郵件',
    text: '這是純文本內容',
    html: '<h1>Hello World</h1><p>這是 HTML 郵件</p>'
  })
});

const result = await response.json();
console.log(result);
```

## 🔐 安全設置

### 1. 更改默認密碼
在管理後台 "設定" 標籤中更改管理員密碼。

### 2. 更新安全密鑰
編輯 `.env` 文件，更改以下密鑰：
```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
```

### 3. 設置 HTTPS (生產環境)
在生產環境中，請使用反向代理（如 Nginx）來啟用 HTTPS。

## 📊 監控和管理

### 儀表板
- 總發送郵件數
- 活躍 SMTP 數量
- 活躍 API 密鑰數量
- 今日郵件數量

### 郵件記錄
查看所有郵件發送記錄，包括：
- 發送時間
- 收件人
- 使用的 SMTP
- 發送狀態

### SMTP 輪播
系統自動選擇使用量最少的可用 SMTP 配置，實現負載均衡。

## 🛠️ 常用操作

### 重置月使用量
在儀表板中點擊 "重置月使用量" 按鈕。

### 停用/啟用 SMTP
在 SMTP 配置中編輯配置，切換啟用狀態。

### 管理 API 密鑰
- 設置使用限制
- 設置到期時間
- 監控使用情況

## 🚨 故障排除

### 數據庫連接問題
```bash
# 檢查 PostgreSQL 狀態
sudo systemctl status postgresql

# 測試連接
psql -h localhost -U your_user -d smtp_rotation_db
```

### SMTP 發送失敗
1. 檢查 SMTP 配置是否正確
2. 驗證認證資訊
3. 確認防火牆設置
4. 查看郵件記錄中的錯誤信息

### API 密鑰問題
1. 確認密鑰是否有效
2. 檢查使用限制
3. 驗證到期時間

## 📁 項目結構

```
├── server.js           # 主服務器文件
├── prisma/
│   └── schema.prisma   # 數據庫架構
├── public/
│   ├── index.html      # 主頁
│   └── admin.html      # 管理後台
├── .env                # 環境配置
├── package.json        # 依賴配置
├── API_DOCUMENTATION.md    # API 文檔
├── DATABASE_SETUP.md   # 數據庫設置指南
└── QUICK_START.md      # 快速開始指南
```

## 🆘 獲取幫助

如遇問題，請檢查：
1. [API 文檔](./API_DOCUMENTATION.md)
2. [數據庫設置指南](./DATABASE_SETUP.md)
3. 應用程序日誌
4. 數據庫連接狀態

## 🎉 完成！

您的 SMTP 輪播系統現在已經準備就緒！

- 🌐 主頁: http://localhost:3000
- 🔧 管理後台: http://localhost:3000/admin
- 📧 API 端點: http://localhost:3000/api/send-email

享受使用這個強大的 SMTP 輪播系統！ 🚀