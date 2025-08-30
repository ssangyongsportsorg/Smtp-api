# API 文檔

## 概述

SMTP 輪播系統提供 RESTful API 來管理 SMTP 配置、API key 和發送郵件。

## 認證

### JWT Token (管理員 API)
管理員 API 需要在請求標頭中包含 JWT token：
```
Authorization: Bearer <your-jwt-token>
```

### API Key (郵件發送 API)
郵件發送 API 需要在請求標頭中包含 API key：
```
x-api-key: <your-api-key>
```

## 端點

### 系統狀態

#### GET /api/status
檢查系統狀態

**回應：**
```json
{
  "status": "online",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "adminConfigured": true,
  "uptime": 3600,
  "version": "1.0.0"
}
```

### 管理員認證

#### GET /api/admin/check-registration
檢查是否需要註冊管理員

**回應：**
```json
{
  "needsRegistration": false
}
```

#### POST /api/admin/register
註冊第一個管理員帳號（僅在沒有管理員時可用）

**請求體：**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

**回應：**
```json
{
  "message": "Admin registered successfully",
  "token": "jwt-token-here",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

#### POST /api/admin/login
管理員登入

**請求體：**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**回應：**
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

#### POST /api/admin/change-password
更改管理員密碼

**請求體：**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### SMTP 配置管理

#### GET /api/admin/smtp-configs
取得所有 SMTP 配置

**回應：**
```json
[
  {
    "id": 1,
    "name": "Gmail SMTP",
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "user@gmail.com",
    "password": "encrypted-password",
    "maxMonthlyQuota": 1000,
    "currentUsage": 150,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/admin/smtp-configs
新增 SMTP 配置

**請求體：**
```json
{
  "name": "Gmail SMTP",
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "user@gmail.com",
  "password": "app-password",
  "maxMonthlyQuota": 1000
}
```

#### PUT /api/admin/smtp-configs/:id
更新 SMTP 配置

**請求體：**
```json
{
  "name": "Updated Gmail SMTP",
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "user@gmail.com",
  "password": "new-app-password",
  "maxMonthlyQuota": 2000,
  "isActive": true
}
```

#### DELETE /api/admin/smtp-configs/:id
刪除 SMTP 配置

### API Key 管理

#### GET /api/admin/api-keys
取得所有 API key

**回應：**
```json
[
  {
    "id": 1,
    "keyName": "Production API Key",
    "keyValue": "abc123...",
    "isActive": true,
    "usageCount": 150,
    "maxUsage": 1000,
    "maxHourlyQuota": 10,
    "maxDailyQuota": 100,
    "maxMonthlyQuota": 1000,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
]
```

#### POST /api/admin/api-keys
新增 API key

**請求體：**
```json
{
  "keyName": "Production API Key",
  "maxUsage": 1000,
  "maxHourlyQuota": 10,
  "maxDailyQuota": 100,
  "maxMonthlyQuota": 1000,
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

#### PUT /api/admin/api-keys/:id
更新 API key

**請求體：**
```json
{
  "keyName": "Updated API Key",
  "maxUsage": 2000,
  "maxHourlyQuota": 20,
  "maxDailyQuota": 200,
  "maxMonthlyQuota": 2000,
  "isActive": true,
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

#### DELETE /api/admin/api-keys/:id
刪除 API key

### 郵件發送

#### POST /api/send-email
發送郵件

**請求標頭：**
```
x-api-key: your-api-key-here
Content-Type: application/json
```

**請求體：**
```json
{
  "to": "recipient@example.com",
  "subject": "測試郵件",
  "text": "這是純文字內容",
  "html": "<h1>這是 HTML 內容</h1>",
  "from": "sender@example.com"
}
```

**回應：**
```json
{
  "message": "Email sent successfully",
  "usedSmtp": "Gmail SMTP",
  "newUsage": 151,
  "quotas": {
    "hourly": { "used": 5, "limit": 10 },
    "daily": { "used": 25, "limit": 100 },
    "monthly": { "used": 151, "limit": 1000 }
  }
}
```

### 郵件記錄

#### GET /api/admin/email-logs
取得郵件記錄

**查詢參數：**
- `page`: 頁碼 (預設: 1)
- `limit`: 每頁記錄數 (預設: 50)

**回應：**
```json
{
  "logs": [
    {
      "id": 1,
      "to": "recipient@example.com",
      "subject": "測試郵件",
      "status": "sent",
      "sentAt": "2024-01-01T00:00:00.000Z",
      "apiKey": { "keyName": "Production API Key" },
      "smtpConfig": { "name": "Gmail SMTP" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

#### DELETE /api/admin/email-logs/clear
清空所有郵件記錄

### 系統管理

#### POST /api/admin/reset-monthly-usage
重置所有 SMTP 的月使用量

## 錯誤處理

### 錯誤回應格式
```json
{
  "error": "錯誤訊息",
  "details": "詳細錯誤資訊 (可選)"
}
```

### 常見錯誤碼

- `400` - 請求參數錯誤
- `401` - 未授權 (缺少或無效的 token/API key)
- `403` - 禁止存取
- `429` - 速率限制超出
- `500` - 伺服器內部錯誤
- `503` - 服務不可用

### 速率限制

- **一般 API**: 15分鐘內最多100次請求
- **管理員 API**: 15分鐘內最多10次請求
- **登入 API**: 15分鐘內最多5次嘗試
- **API Key 限制**: 可設定每小時、每日、每月限制

## 使用範例

### 使用 cURL 發送郵件
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "to": "test@example.com",
    "subject": "測試郵件",
    "text": "這是測試內容",
    "html": "<h1>測試標題</h1><p>這是測試內容</p>"
  }'
```

### 使用 JavaScript 發送郵件
```javascript
const response = await fetch('http://localhost:3000/api/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key-here'
  },
  body: JSON.stringify({
    to: 'test@example.com',
    subject: '測試郵件',
    text: '這是測試內容',
    html: '<h1>測試標題</h1><p>這是測試內容</p>'
  })
});

const result = await response.json();
console.log(result);
```

### 使用 Python 發送郵件
```python
import requests

response = requests.post(
    'http://localhost:3000/api/send-email',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key-here'
    },
    json={
        'to': 'test@example.com',
        'subject': '測試郵件',
        'text': '這是測試內容',
        'html': '<h1>測試標題</h1><p>這是測試內容</p>'
    }
)

result = response.json()
print(result)
```

## 注意事項

1. **API Key 安全**: 請妥善保管您的 API key，不要暴露在客戶端代碼中
2. **速率限制**: 請注意各種速率限制，避免超出限制
3. **錯誤處理**: 請妥善處理 API 錯誤回應
4. **HTTPS**: 生產環境請使用 HTTPS
5. **日誌記錄**: 建議記錄所有 API 調用以便監控和除錯