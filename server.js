require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cronjob', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cronjob.html'));
});

app.get('/api/smtp-configs', async (req, res) => {
  try {
    const configs = await prisma.smtpConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMTP configurations' });
  }
});

app.post('/api/smtp-configs', async (req, res) => {
  try {
    const { name, host, port, username, password, maxMonthlyQuota } = req.body;
    const config = await prisma.smtpConfig.create({
      data: {
        name,
        host,
        port: parseInt(port),
        username,
        password,
        maxMonthlyQuota: parseInt(maxMonthlyQuota)
      }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create SMTP configuration' });
  }
});

app.put('/api/smtp-configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, host, port, username, password, maxMonthlyQuota, isActive } = req.body;
    const config = await prisma.smtpConfig.update({
      where: { id: parseInt(id) },
      data: {
        name,
        host,
        port: parseInt(port),
        username,
        password,
        maxMonthlyQuota: parseInt(maxMonthlyQuota),
        isActive
      }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SMTP configuration' });
  }
});

app.delete('/api/smtp-configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.smtpConfig.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'SMTP configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete SMTP configuration' });
  }
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    
    const availableConfigs = await prisma.smtpConfig.findMany({
      where: {
        isActive: true,
        currentUsage: {
          lt: prisma.smtpConfig.fields.maxMonthlyQuota
        }
      },
      orderBy: { currentUsage: 'asc' }
    });

    if (availableConfigs.length === 0) {
      return res.status(503).json({ error: 'No available SMTP configurations' });
    }

    const selectedConfig = availableConfigs[0];

    let transporter;
    if (selectedConfig.apiKey) {
      // SendGrid 方式
      transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: selectedConfig.apiKey
        }
      });
    } else {
      // 傳統 SMTP 方式
      transporter = nodemailer.createTransport({
        host: selectedConfig.host,
        port: selectedConfig.port,
        secure: selectedConfig.port === 465,
        auth: {
          user: selectedConfig.username,
          pass: selectedConfig.password
        }
      });
    }

    const mailOptions = {
      from: selectedConfig.username,
      to,
      subject,
      text,
      html
    };

    await transporter.sendMail(mailOptions);

    await prisma.smtpConfig.update({
      where: { id: selectedConfig.id },
      data: { currentUsage: selectedConfig.currentUsage + 1 }
    });

    res.json({ 
      message: 'Email sent successfully',
      usedSmtp: selectedConfig.name,
      newUsage: selectedConfig.currentUsage + 1
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

app.post('/api/reset-monthly-usage', async (req, res) => {
  try {
    await prisma.smtpConfig.updateMany({
      data: { currentUsage: 0 }
    });
    res.json({ message: 'Monthly usage reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset monthly usage' });
  }
});

(async () => {
  // 啟動時自動建立 admin/yan111
  const admin = await prisma.admin.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('yan111', 10);
    await prisma.admin.create({ data: { username: 'admin', password: hashedPassword } });
    console.log('Default admin created: admin/yan111');
  }
})();

// 登入 API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  // 這裡可回傳 token 或 session，暫時只回傳成功
  res.json({ message: 'Login successful' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});