# Render 部署指南

本指南將幫助您在 Render 平台上部署 SMTP 輪播系統。

## 前置要求

1. 一個 Render 帳號 (免費註冊: https://render.com)
2. 您的代碼已推送到 GitHub 或其他 Git 平台

## 部署步驟

### 方法一：使用 Blueprint (推薦)

1. **登入 Render Dashboard**
   - 訪問 https://dashboard.render.com
   - 使用 GitHub 帳號登入

2. **創建 Blueprint**
   - 點擊 "New +" 按鈕
   - 選擇 "Blueprint"
   - 連接您的 GitHub 倉庫

3. **配置部署**
   - Render 會自動檢測 `render.yaml` 文件
   - 系統會創建 Web 服務和 PostgreSQL 數據庫
   - 點擊 "Apply" 開始部署

4. **等待部署完成**
   - 首次部署可能需要 5-10 分鐘
   - 您可以在 Dashboard 中查看部署進度

### 方法二：手動部署

#### 1. 創建 PostgreSQL 數據庫

1. 在 Render Dashboard 中點擊 "New +"
2. 選擇 "PostgreSQL"
3. 配置：
   - **Name**: `smtp-rotation-db`
   - **Database**: `smtp_rotation_db`
   - **User**: `smtp_rotation_user`
   - **Region**: 選擇離您最近的區域
4. 點擊 "Create Database"
5. 記下連接字符串 (Connection String)

#### 2. 創建 Web 服務

1. 在 Render Dashboard 中點擊 "New +"
2. 選擇 "Web Service"
3. 連接您的 GitHub 倉庫
4. 配置服務：
   - **Name**: `smtp-rotation-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx prisma db push && npm start`
   - **Plan**: 選擇免費計劃 (Free)

#### 3. 配置環境變量

在 Web 服務的 "Environment" 標籤中添加以下變量：

```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_SECRET=your-super-secret-session-key-here
DATABASE_URL=postgresql://... (從 PostgreSQL 服務複製)
ALLOWED_ORIGINS=https://your-app-name.onrender.com
```

#### 4. 部署

1. 點擊 "Create Web Service"
2. 等待部署完成

## 部署後配置

### 1. 訪問應用

部署完成後，您會得到一個 URL，例如：
`https://smtp-rotation-system.onrender.com`

### 2. 首次設置

1. 訪問 `https://your-app-name.onrender.com/admin`
2. 註冊第一個管理員帳號
3. 登入後配置 SMTP 設定
4. 生成 API key

### 3. 配置自定義域名 (可選)

1. 在 Web 服務設置中點擊 "Settings"
2. 在 "Custom Domains" 部分添加您的域名
3. 更新 DNS 記錄指向 Render

## 環境變量說明

| 變量名 | 說明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 連接字符串 | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 簽名密鑰 | 隨機字符串 |
| `SESSION_SECRET` | 會話密鑰 | 隨機字符串 |
| `NODE_ENV` | 環境模式 | `production` |
| `PORT` | 服務端口 | `10000` |
| `ALLOWED_ORIGINS` | 允許的 CORS 域名 | `https://your-app.onrender.com` |

## 故障排除

### 常見問題

1. **部署失敗**
   - 檢查 Build Command 是否正確
   - 確認 package.json 存在
   - 查看 Build Logs 中的錯誤信息

2. **數據庫連接失敗**
   - 確認 DATABASE_URL 格式正確
   - 檢查數據庫是否已創建
   - 確認網絡連接

3. **應用無法啟動**
   - 檢查 Start Command 是否正確
   - 查看 Runtime Logs
   - 確認環境變量已設置

4. **CORS 錯誤**
   - 更新 ALLOWED_ORIGINS 為您的實際域名
   - 確保包含協議 (https://)

### 查看日誌

1. 在 Render Dashboard 中選擇您的 Web 服務
2. 點擊 "Logs" 標籤
3. 查看實時日誌或下載日誌文件

## 性能優化

### 免費計劃限制

- 每月 750 小時運行時間
- 15 分鐘無活動後自動休眠
- 首次訪問需要 30-60 秒喚醒

### 升級建議

如果需要更好的性能，可以升級到付費計劃：
- 無休眠時間
- 更多資源分配
- 更好的響應速度

## 安全注意事項

1. **密鑰管理**
   - 使用強密碼生成 JWT_SECRET 和 SESSION_SECRET
   - 定期更換密鑰
   - 不要在代碼中硬編碼密鑰

2. **數據庫安全**
   - 定期備份數據庫
   - 使用強密碼
   - 限制數據庫訪問

3. **應用安全**
   - 啟用 HTTPS
   - 配置適當的 CORS 策略
   - 定期更新依賴包

## 監控和維護

1. **設置監控**
   - 在 Render Dashboard 中查看服務狀態
   - 設置告警通知
   - 監控資源使用情況

2. **定期維護**
   - 更新依賴包
   - 檢查安全漏洞
   - 備份數據

## 支持

如果遇到問題，可以：
1. 查看 Render 官方文檔
2. 檢查應用日誌
3. 聯繫 Render 支持團隊