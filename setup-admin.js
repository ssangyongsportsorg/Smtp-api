require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst();
    
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.username);
      return;
    }

    // Create default admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        isActive: true
      }
    });

    console.log('Default admin created successfully:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@example.com');
    
  } catch (error) {
    console.error('Error setting up default admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDefaultAdmin();