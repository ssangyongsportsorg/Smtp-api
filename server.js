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
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy (Render, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Admin rate limiting (more strict)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many admin requests from this IP, please try again later.'
});
app.use('/api/admin/', adminLimiter);

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.'
});
app.use('/api/admin/login', loginLimiter);

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
}));

// Check if admin exists
async function checkAdminExists() {
  try {
    const adminCount = await prisma.admin.count();
    return adminCount > 0;
  } catch (error) {
    console.error('Error checking admin existence:', error);
    return false;
  }
}

// Initialize default admin user (only if no admin exists)
async function initializeAdmin() {
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      console.log('No admin user found. Please register the first admin at /admin');
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

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API Key middleware with enhanced security
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
    console.error('API key validation error:', error);
    res.status(500).json({ error: 'Error validating API key' });
  }
};

// Generate secure API key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Routes

// Server status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const dbStatus = await prisma.$queryRaw`SELECT 1`;
    const adminExists = await checkAdminExists();
    
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      database: 'connected',
      adminConfigured: adminExists,
      uptime: process.uptime(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Check if admin registration is needed
app.get('/api/admin/check-registration', async (req, res) => {
  try {
    const adminExists = await checkAdminExists();
    res.json({ needsRegistration: !adminExists });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check admin status' });
  }
});

// Admin registration (only if no admin exists)
app.post('/api/admin/register', async (req, res) => {
  try {
    const adminExists = await checkAdminExists();
    if (adminExists) {
      return res.status(403).json({ error: 'Admin already exists' });
    }

    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if username or email already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        email
      }
    });

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin registered successfully',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await prisma.admin.findUnique({
      where: { username, isActive: true }
    });

    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
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
    console.error('Login error:', error);
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
    const { keyName, maxUsage, maxHourlyQuota, maxDailyQuota, maxMonthlyQuota, expiresAt } = req.body;
    const keyValue = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        keyName,
        keyValue,
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        maxHourlyQuota: maxHourlyQuota ? parseInt(maxHourlyQuota) : null,
        maxDailyQuota: maxDailyQuota ? parseInt(maxDailyQuota) : null,
        maxMonthlyQuota: maxMonthlyQuota ? parseInt(maxMonthlyQuota) : null,
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
    const { keyName, maxUsage, maxHourlyQuota, maxDailyQuota, maxMonthlyQuota, expiresAt, isActive } = req.body;

    const apiKey = await prisma.apiKey.update({
      where: { id: parseInt(id) },
      data: {
        keyName,
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        maxHourlyQuota: maxHourlyQuota ? parseInt(maxHourlyQuota) : null,
        maxDailyQuota: maxDailyQuota ? parseInt(maxDailyQuota) : null,
        maxMonthlyQuota: maxMonthlyQuota ? parseInt(maxMonthlyQuota) : null,
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
    
    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'to, subject, and either text or html are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check API key rate limits
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [hourlyCount, dailyCount, monthlyCount] = await Promise.all([
      prisma.emailLog.count({
        where: {
          apiKeyId: req.apiKey.id,
          sentAt: { gte: oneHourAgo }
        }
      }),
      prisma.emailLog.count({
        where: {
          apiKeyId: req.apiKey.id,
          sentAt: { gte: oneDayAgo }
        }
      }),
      prisma.emailLog.count({
        where: {
          apiKeyId: req.apiKey.id,
          sentAt: { gte: oneMonthAgo }
        }
      })
    ]);

    // Check rate limits
    if (req.apiKey.maxHourlyQuota && hourlyCount >= req.apiKey.maxHourlyQuota) {
      return res.status(429).json({ error: 'Hourly quota exceeded' });
    }
    if (req.apiKey.maxDailyQuota && dailyCount >= req.apiKey.maxDailyQuota) {
      return res.status(429).json({ error: 'Daily quota exceeded' });
    }
    if (req.apiKey.maxMonthlyQuota && monthlyCount >= req.apiKey.maxMonthlyQuota) {
      return res.status(429).json({ error: 'Monthly quota exceeded' });
    }
    
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
      newUsage: selectedConfig.currentUsage + 1,
      quotas: {
        hourly: { used: hourlyCount + 1, limit: req.apiKey.maxHourlyQuota },
        daily: { used: dailyCount + 1, limit: req.apiKey.maxDailyQuota },
        monthly: { used: monthlyCount + 1, limit: req.apiKey.maxMonthlyQuota }
      }
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

// 新增：全部刪除 email log
app.delete('/api/admin/email-logs/clear', authenticateToken, async (req, res) => {
  try {
    await prisma.emailLog.deleteMany({});
    res.json({ message: '所有郵件記錄已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除郵件記錄失敗' });
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