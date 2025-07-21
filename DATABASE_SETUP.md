# PostgreSQL 數據庫設定指引

## 1. 安裝 PostgreSQL

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### CentOS/RHEL:
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### macOS (使用 Homebrew):
```bash
brew install postgresql
brew services start postgresql
```

### Windows:
下載並安裝 PostgreSQL 從 https://www.postgresql.org/download/windows/

## 2. 創建數據庫和用戶

連接到 PostgreSQL：
```bash
sudo -u postgres psql
```

在 PostgreSQL 命令行中執行：
```sql
-- 創建數據庫
CREATE DATABASE smtp_rotation_db;

-- 創建用戶
CREATE USER smtp_user WITH PASSWORD 'your_secure_password';

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE smtp_rotation_db TO smtp_user;

-- 授予 schema 權限
\c smtp_rotation_db
GRANT ALL ON SCHEMA public TO smtp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smtp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smtp_user;

-- 退出
\q
```

## 3. 更新 .env 文件

更新您的 `.env` 文件中的 DATABASE_URL：

```env
DATABASE_URL="postgresql://smtp_user:your_secure_password@localhost:5432/smtp_rotation_db?schema=public"
```

## 4. 驗證連接

測試數據庫連接：
```bash
psql -h localhost -U smtp_user -d smtp_rotation_db
```

## 5. 推送數據庫架構

在項目目錄中運行：
```bash
npm run db:push
```

這將創建所需的表格：
- `admins` - 管理員帳號
- `api_keys` - API 密鑰
- `smtp_configs` - SMTP 配置
- `email_logs` - 郵件發送記錄

## 6. 驗證設置

啟動應用程序：
```bash
npm run dev
```

如果一切設置正確，您應該看到：
```
Server running on port 3000
Default admin user created
```

## 7. 生產環境配置

### 安全設置
1. 使用強密碼
2. 限制數據庫訪問權限
3. 啟用 SSL 連接
4. 定期備份數據庫

### SSL 連接 (推薦)
如果您的 PostgreSQL 支持 SSL，更新 DATABASE_URL：
```env
DATABASE_URL="postgresql://smtp_user:password@localhost:5432/smtp_rotation_db?schema=public&sslmode=require"
```

## 8. 常見問題

### 連接被拒絕
檢查 PostgreSQL 是否正在運行：
```bash
sudo systemctl status postgresql
```

### 權限問題
確保用戶有足夠的權限：
```sql
GRANT ALL PRIVILEGES ON DATABASE smtp_rotation_db TO smtp_user;
```

### 端口問題
默認 PostgreSQL 端口是 5432，確保它沒有被防火牆阻擋。

## 9. 備份和恢復

### 備份數據庫
```bash
pg_dump -h localhost -U smtp_user -d smtp_rotation_db > backup.sql
```

### 恢復數據庫
```bash
psql -h localhost -U smtp_user -d smtp_rotation_db < backup.sql
```

## 10. 遠程數據庫

如果使用雲端數據庫服務（如 AWS RDS、Google Cloud SQL、Azure Database），請確保：

1. 數據庫實例允許來自您的服務器的連接
2. 安全群組/防火牆規則正確配置
3. 使用正確的連接字符串

範例雲端連接字符串：
```env
# AWS RDS
DATABASE_URL="postgresql://username:password@your-db-instance.region.rds.amazonaws.com:5432/smtp_rotation_db?schema=public"

# Google Cloud SQL
DATABASE_URL="postgresql://username:password@your-ip:5432/smtp_rotation_db?schema=public"
```

設置完成後，您就可以開始使用 SMTP 輪播系統了！