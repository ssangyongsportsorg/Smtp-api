# SMTP 輪播系統

一個功能完整的 SMTP 輪播系統，支援多個 SMTP 配置、API key 管理、速率限制和安全的後台管理介面。

## 功能特色

### 🔐 安全性
- JWT 身份驗證
- API key 驗證
- 密碼加密存儲
- 速率限制防護
- 安全標頭配置
- 輸入驗證

### 📧 郵件功能
- 多 SMTP 配置輪播
- 自動負載平衡
- 使用量限制 (每小時/每日/每月)
- 郵件發送記錄
- 錯誤處理

### 🛠️ 管理功能
- 現代化管理後台
- 首次部署自動註冊
- SMTP 配置管理
- API key 管理
- 郵件記錄查看
- 即時系統狀態監控

### 📊 監控功能
- 伺服器狀態檢查
- 資料庫連接狀態
- 管理員設定狀態
- 系統運行時間
- 即時更新

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境配置

複製 `.env.example` 到 `.env` 並配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件：

```env
# 資料庫配置
DATABASE_URL="postgresql://username:password@localhost:5432/smtp_rotation_db"

# 安全配置
JWT_SECRET="your-super-secret-jwt-key"
SESSION_SECRET="your-super-secret-session-key"

# 伺服器配置
PORT=3000
NODE_ENV=development

# CORS 配置
ALLOWED_ORIGINS="http://localhost:3000"
```

### 3. 資料庫設置

```bash
# 生成 Prisma 客戶端
npm run db:generate

# 推送資料庫結構
npm run db:push
```

### 4. 啟動服務

```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

### 5. 首次設置

1. 訪問 `http://localhost:3000` 查看系統狀態
2. 訪問 `http://localhost:3000/admin` 註冊第一個管理員帳號
3. 登入後配置 SMTP 和 API key

## API 使用

### 發送郵件

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "to": "recipient@example.com",
    "subject": "測試郵件",
    "text": "這是純文字內容",
    "html": "<h1>這是 HTML 內容</h1>"
  }'
```

### 檢查系統狀態

```bash
curl http://localhost:3000/api/status
```

## 管理後台

### 功能模組

1. **SMTP 配置管理**
   - 新增/編輯/刪除 SMTP 配置
   - 監控使用量
   - 啟用/停用配置

2. **API Key 管理**
   - 生成安全的 API key
   - 設定使用限制 (總次數、每小時、每日、每月)
   - 設定過期時間

3. **郵件記錄**
   - 查看發送歷史
   - 篩選和搜尋
   - 清空記錄

### 安全功能

- 首次部署自動檢測並要求註冊
- 密碼強度驗證
- 會話管理
- 速率限制

## 部署指南

### 生產環境配置

1. **環境變數**
   ```env
   NODE_ENV=production
   JWT_SECRET=your-very-strong-secret-key
   SESSION_SECRET=your-very-strong-session-key
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. **資料庫**
   - 使用生產級 PostgreSQL
   - 啟用 SSL 連接
   - 設定適當的連接池

3. **反向代理**
   - 使用 Nginx 或 Apache
   - 啟用 HTTPS
   - 設定適當的安全標頭

4. **監控**
   - 設定日誌記錄
   - 監控系統資源
   - 設定警報

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

## 安全考量

### 已實現的安全措施

- ✅ JWT token 驗證
- ✅ 密碼加密存儲
- ✅ API key 驗證
- ✅ 速率限制
- ✅ 輸入驗證
- ✅ SQL 注入防護
- ✅ XSS 防護
- ✅ CSRF 防護

### 建議的安全措施

- 使用 HTTPS
- 定期更新依賴
- 監控異常活動
- 定期備份資料
- 實施日誌記錄

詳細安全檢查清單請參考 [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

## 開發

### 專案結構

```
├── server.js              # 主伺服器文件
├── prisma/                # 資料庫配置
│   └── schema.prisma      # 資料庫結構
├── public/                # 靜態文件
│   ├── index.html         # 狀態頁面
│   └── admin.html         # 管理後台
├── package.json           # 依賴配置
└── .env.example          # 環境變數範例
```

### 開發命令

```bash
# 開發模式
npm run dev

# 資料庫操作
npm run db:generate    # 生成 Prisma 客戶端
npm run db:push        # 推送資料庫結構
npm run db:migrate     # 執行資料庫遷移
```

## 貢獻

1. Fork 專案
2. 創建功能分支
3. 提交變更
4. 發起 Pull Request

## 授權

MIT License

## 支援

如有問題或建議，請開立 Issue 或聯絡開發團隊。
