# SMTP 輪替發信系統

一個基於 Node.js 的 SMTP 輪替發信系統，具備管理後台和自動輪替功能。

## 功能特色

- 🚀 多 SMTP 配置管理
- 🔄 智能輪替發信
- 📊 月使用量追蹤
- 🎨 美觀的 Flowbite UI
- 📅 Cron Job 月重置
- 🛡️ 自動跳過超額 SMTP

## 安裝與設定

1. 安裝依賴套件：
```bash
npm install
```

2. 初始化資料庫：
```bash
npm run db:push
```

3. 啟動服務：
```bash
npm run dev
```

## 使用方式

### 管理後台
訪問 `http://localhost:3000` 進入 SMTP 管理後台：
- 新增/編輯 SMTP 配置
- 監控使用量和狀態
- 設定每月發信額度

### 發送郵件 API
```bash
POST /send-email
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "測試郵件",
  "text": "純文字內容",
  "html": "<h1>HTML 內容</h1>"
}
```

### Cron Job 設定
每月 1 號重置使用量：
```bash
0 0 1 * * curl -X GET http://your-domain.com/cronjob?auto=true
```

或手動訪問：`http://localhost:3000/cronjob`

## 資料庫結構

### SmtpConfig 表
- `id`: 主鍵
- `name`: SMTP 名稱
- `host`: 主機地址
- `port`: 連接埠
- `username`: 使用者名稱
- `password`: 密碼
- `maxMonthlyQuota`: 月發信額度
- `currentUsage`: 當前使用量
- `isActive`: 是否啟用

## 輪替邏輯

系統會自動：
1. 選擇可用的 SMTP（未超額且啟用）
2. 按使用量排序，優先使用較少的
3. 發信成功後更新使用量
4. 超額的 SMTP 自動暫停使用

## 環境變數

```env
DATABASE_URL="file:./dev.db"
PORT=3000
```

## API 端點

- `GET /` - 管理後台首頁
- `GET /cronjob` - Cron Job 頁面
- `GET /api/smtp-configs` - 取得所有 SMTP 配置
- `POST /api/smtp-configs` - 新增 SMTP 配置
- `PUT /api/smtp-configs/:id` - 更新 SMTP 配置
- `DELETE /api/smtp-configs/:id` - 刪除 SMTP 配置
- `POST /send-email` - 發送郵件
- `POST /api/reset-monthly-usage` - 重置月使用量# Smtp-api
