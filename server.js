require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize default admin user
async function initializeAdmin() {
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 12);
      await prisma.admin.create({
        data: {
          username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
          password: hashedPassword,
          email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'
        }
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API Key middleware
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyValue: apiKey, isActive: true }
    });

    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check if key is expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'API key expired' });
    }

    // Check usage limit
    if (keyRecord.maxUsage && keyRecord.usageCount >= keyRecord.maxUsage) {
      return res.status(429).json({ error: 'API key usage limit exceeded' });
    }

    req.apiKey = keyRecord;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error validating API key' });
  }
};

// Generate secure API key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Routes

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { username, isActive: true }
    });

    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change admin password
app.post('/api/admin/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id }
    });

    if (!await bcrypt.compare(currentPassword, admin.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// API Key management routes

// Get all API keys
app.get('/api/admin/api-keys', authenticateToken, async (req, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        keyName: true,
        keyValue: true,
        isActive: true,
        usageCount: true,
        maxUsage: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(apiKeys);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create new API key
app.post('/api/admin/api-keys', authenticateToken, async (req, res) => {
  try {
    const { keyName, maxUsage, expiresAt } = req.body;
    const keyValue = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        keyName,
        keyValue,
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    res.json(apiKey);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Update API key
app.put('/api/admin/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { keyName, maxUsage, expiresAt, isActive } = req.body;

    const apiKey = await prisma.apiKey.update({
      where: { id: parseInt(id) },
      data: {
        keyName,
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive
      }
    });

    res.json(apiKey);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Delete API key
app.delete('/api/admin/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.apiKey.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// SMTP Config routes (protected)
app.get('/api/admin/smtp-configs', authenticateToken, async (req, res) => {
  try {
    const configs = await prisma.smtpConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMTP configurations' });
  }
});

app.post('/api/admin/smtp-configs', authenticateToken, async (req, res) => {
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

app.put('/api/admin/smtp-configs/:id', authenticateToken, async (req, res) => {
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

app.delete('/api/admin/smtp-configs/:id', authenticateToken, async (req, res) => {
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

// Public email sending endpoint (requires API key)
app.post('/api/send-email', authenticateApiKey, async (req, res) => {
  try {
    const { to, subject, text, html, from } = req.body;
    
    // Find available SMTP configuration
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
      await prisma.emailLog.create({
        data: {
          apiKeyId: req.apiKey.id,
          to,
          subject,
          status: 'failed',
          errorMessage: 'No available SMTP configurations'
        }
      });
      return res.status(503).json({ error: 'No available SMTP configurations' });
    }

    const selectedConfig = availableConfigs[0];

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: selectedConfig.host,
      port: selectedConfig.port,
      secure: selectedConfig.port === 465,
      auth: {
        user: selectedConfig.username,
        pass: selectedConfig.password
      }
    });

    const mailOptions = {
      from: from || selectedConfig.username, // Use custom sender or default to SMTP username
      to,
      subject,
      text,
      html
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Update usage counts
    await Promise.all([
      prisma.smtpConfig.update({
        where: { id: selectedConfig.id },
        data: { currentUsage: selectedConfig.currentUsage + 1 }
      }),
      prisma.apiKey.update({
        where: { id: req.apiKey.id },
        data: { usageCount: req.apiKey.usageCount + 1 }
      }),
      prisma.emailLog.create({
        data: {
          apiKeyId: req.apiKey.id,
          smtpConfigId: selectedConfig.id,
          to,
          subject,
          status: 'sent'
        }
      })
    ]);

    res.json({ 
      message: 'Email sent successfully',
      usedSmtp: selectedConfig.name,
      newUsage: selectedConfig.currentUsage + 1
    });
  } catch (error) {
    // Log failed attempt
    await prisma.emailLog.create({
      data: {
        apiKeyId: req.apiKey.id,
        to: req.body.to,
        subject: req.body.subject,
        status: 'failed',
        errorMessage: error.message
      }
    });

    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Email logs (admin only)
app.get('/api/admin/email-logs', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const logs = await prisma.emailLog.findMany({
      include: {
        apiKey: { select: { keyName: true } },
        smtpConfig: { select: { name: true } }
      },
      orderBy: { sentAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.emailLog.count();

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

// Reset monthly usage (admin only)
app.post('/api/admin/reset-monthly-usage', authenticateToken, async (req, res) => {
  try {
    await prisma.smtpConfig.updateMany({
      data: { currentUsage: 0 }
    });
    res.json({ message: 'Monthly usage reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset monthly usage' });
  }
});

// Static routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/cronjob', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cronjob.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeAdmin();
});