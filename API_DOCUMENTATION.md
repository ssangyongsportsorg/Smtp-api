# SMTP 輪播系統 API 文檔

## 概述

這是一個 SMTP 輪播系統，支持管理員認證、API 密鑰管理和電子郵件發送功能。系統使用 PostgreSQL 數據庫，提供完整的管理界面和 API。

## 管理員功能

### 1. 管理員登入

**端點:** `POST /api/admin/login`

**請求體:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**回應:**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

**默認管理員帳號:**
- 用戶名: `admin`
- 密碼: `admin123`
- 電子郵件: `admin@example.com`

### 2. 更改密碼

**端點:** `POST /api/admin/change-password`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**請求體:**
```json
{
  "currentPassword": "admin123",
  "newPassword": "new-secure-password"
}
```

## API 密鑰管理

### 1. 獲取所有 API 密鑰

**端點:** `GET /api/admin/api-keys`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

### 2. 創建新 API 密鑰

**端點:** `POST /api/admin/api-keys`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**請求體:**
```json
{
  "keyName": "測試 API 密鑰",
  "maxUsage": 1000,
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

**回應:**
```json
{
  "id": 1,
  "keyName": "測試 API 密鑰",
  "keyValue": "generated-64-character-hex-key",
  "isActive": true,
  "usageCount": 0,
  "maxUsage": 1000,
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 3. 更新 API 密鑰

**端點:** `PUT /api/admin/api-keys/:id`

### 4. 刪除 API 密鑰

**端點:** `DELETE /api/admin/api-keys/:id`

## SMTP 配置管理

### 1. 獲取所有 SMTP 配置

**端點:** `GET /api/admin/smtp-configs`

### 2. 創建 SMTP 配置

**端點:** `POST /api/admin/smtp-configs`

**請求體:**
```json
{
  "name": "Gmail SMTP",
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "your-email@gmail.com",
  "password": "your-app-password",
  "maxMonthlyQuota": 10000
}
```

### 3. 更新 SMTP 配置

**端點:** `PUT /api/admin/smtp-configs/:id`

### 4. 刪除 SMTP 配置

**端點:** `DELETE /api/admin/smtp-configs/:id`

## 電子郵件發送

### 發送電子郵件 (公開 API)

**端點:** `POST /api/send-email`

**Headers:**
```
X-API-Key: your-api-key-here
Content-Type: application/json
```

**請求體:**
```json
{
  "to": "recipient@example.com",
  "subject": "測試郵件",
  "text": "這是純文本內容",
  "html": "<h1>這是 HTML 內容</h1><p>支持 HTML 格式</p>",
  "from": "sender@example.com"
}
```

**參數說明:**
- `to` (必填): 收件人郵箱地址
- `subject` (必填): 郵件主題
- `text` (可選): 純文本內容
- `html` (可選): HTML 格式內容
- `from` (可選): 寄件人郵箱地址，如不提供則使用 SMTP 配置的用戶名

**回應:**
```json
{
  "message": "Email sent successfully",
  "usedSmtp": "Gmail SMTP",
  "newUsage": 1
}
```

## 郵件記錄

### 獲取郵件記錄

**端點:** `GET /api/admin/email-logs`

**查詢參數:**
- `page`: 頁碼 (默認: 1)
- `limit`: 每頁記錄數 (默認: 50)

## 系統設置

### 重置月使用量

**端點:** `POST /api/admin/reset-monthly-usage`

## 錯誤代碼

- `400`: 請求參數錯誤
- `401`: 未授權 (缺少或無效的 API 密鑰/JWT)
- `403`: 禁止訪問 (JWT 過期)
- `404`: 資源不存在
- `429`: 請求過多 (API 密鑰使用限制)
- `500`: 服務器內部錯誤
- `503`: 服務不可用 (沒有可用的 SMTP 配置)

## 環境配置

創建 `.env` 文件：

```env
# 數據庫
DATABASE_URL="postgresql://username:password@localhost:5432/smtp_rotation_db?schema=public"

# 服務器
PORT=3000

# JWT 密鑰 (請更改為您自己的密鑰)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Session 密鑰 (請更改為您自己的密鑰)
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"

# 默認管理員帳號 (首次運行時創建)
DEFAULT_ADMIN_USERNAME="admin"
DEFAULT_ADMIN_PASSWORD="admin123"
DEFAULT_ADMIN_EMAIL="admin@example.com"

# API 設置
API_RATE_LIMIT=1000
```

## 安裝和運行

1. 安裝依賴：
```bash
npm install
```

2. 設置 PostgreSQL 數據庫並更新 `.env` 文件中的 `DATABASE_URL`

3. 生成 Prisma 客戶端：
```bash
npm run db:generate
```

4. 推送數據庫架構：
```bash
npm run db:push
```

5. 啟動服務器：
```bash
npm run dev  # 開發模式
# 或
npm start   # 生產模式
```

6. 訪問管理界面：
- 主頁: `http://localhost:3000`
- 管理後台: `http://localhost:3000/admin`

## 安全建議

1. **更改默認密碼**: 首次登入後立即更改管理員密碼
2. **更新 JWT 密鑰**: 在生產環境中使用強密鑰
3. **API 密鑰管理**: 定期輪換 API 密鑰
4. **使用 HTTPS**: 在生產環境中啟用 SSL/TLS
5. **數據庫安全**: 確保數據庫連接安全
6. **訪問控制**: 限制管理界面的網絡訪問

## 使用範例

### JavaScript 發送郵件範例

```javascript
const apiKey = 'your-api-key-here';
const apiUrl = 'http://localhost:3000/api/send-email';

async function sendEmail() {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        to: 'recipient@example.com',
        subject: '測試郵件',
        text: '這是純文本內容',
        html: '<h1>Hello World</h1><p>這是 HTML 郵件</p>',
        from: 'sender@example.com'
      })
    });

    const result = await response.json();
    console.log('郵件發送結果:', result);
  } catch (error) {
    console.error('發送郵件失敗:', error);
  }
}

sendEmail();
```

### cURL 範例

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "to": "recipient@example.com",
    "subject": "測試郵件",
    "text": "這是純文本內容",
    "html": "<h1>Hello World</h1><p>這是 HTML 郵件</p>",
    "from": "sender@example.com"
  }'
```

## 支持

如有問題，請檢查：
1. 數據庫連接是否正確
2. SMTP 配置是否有效
3. API 密鑰是否有效且未過期
4. 日誌中的錯誤消息

管理界面提供了完整的監控和管理功能，包括 SMTP 狀態、API 使用統計和郵件發送記錄。