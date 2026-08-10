import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { AdminRole } from '../models/AdminRole.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { ADMIN_PERMISSIONS, USER_ROLES, PLATFORM_SETTING_CATEGORY } from '../constants/index.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agriconnect';

const seedAdminAndSettings = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    // 1. Seed SuperAdmin Role with ALL permissions
    let superAdminRole = await AdminRole.findOne({ name: 'SuperAdmin' });
    const allPermissions = Object.values(ADMIN_PERMISSIONS);

    if (!superAdminRole) {
      superAdminRole = await AdminRole.create({
        name: 'SuperAdmin',
        permissions: allPermissions,
        description: 'Super Administrator with full access to all 15 admin modules',
        isSystem: true,
      });
      console.log('Created SuperAdmin role with all permissions.');
    } else {
      superAdminRole.permissions = allPermissions;
      await superAdminRole.save();
      console.log('Updated SuperAdmin role permissions.');
    }

    // 2. Seed Moderator Role
    let moderatorRole = await AdminRole.findOne({ name: 'Moderator' });
    if (!moderatorRole) {
      await AdminRole.create({
        name: 'Moderator',
        permissions: [
          ADMIN_PERMISSIONS.MODERATE_JOBS,
          ADMIN_PERMISSIONS.MANAGE_REPORTS,
          ADMIN_PERMISSIONS.MANAGE_CERTIFICATES,
        ],
        description: 'Content moderator for jobs, certificates, and user reports',
        isSystem: true,
      });
      console.log('Created Moderator role.');
    }

    // 3. Seed Support Role
    let supportRole = await AdminRole.findOne({ name: 'Support' });
    if (!supportRole) {
      await AdminRole.create({
        name: 'Support',
        permissions: [
          ADMIN_PERMISSIONS.MANAGE_USERS,
          ADMIN_PERMISSIONS.MANAGE_REPORTS,
          ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
        ],
        description: 'Customer support agent for user assistance and report resolution',
        isSystem: true,
      });
      console.log('Created Support role.');
    }

    // 4. Seed SuperAdmin User
    const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@agriconnect.com';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@123456';
    const adminMobile = process.env.ADMIN_SEED_MOBILE || '9999999999';

    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      adminUser = await User.create({
        name: 'AgriConnect Super Admin',
        email: adminEmail,
        mobile: adminMobile,
        password: adminPassword,
        role: USER_ROLES.ADMIN,
        adminRole: superAdminRole._id,
        isVerified: true,
        profileCompleted: true,
        isActive: true,
      });
      console.log(`Created default SuperAdmin user: ${adminEmail}`);
    } else {
      adminUser.role = USER_ROLES.ADMIN;
      adminUser.adminRole = superAdminRole._id;
      adminUser.isActive = true;
      await adminUser.save();
      console.log(`Updated existing user ${adminEmail} to SuperAdmin role.`);
    }

    // 5. Seed Default Platform Settings
    const defaultSettings = [
      {
        key: 'maintenance_mode',
        value: false,
        type: 'boolean',
        category: PLATFORM_SETTING_CATEGORY.GENERAL,
        description: 'Enable maintenance mode across the platform',
      },
      {
        key: 'max_active_jobs_per_farmer',
        value: 10,
        type: 'number',
        category: PLATFORM_SETTING_CATEGORY.JOBS,
        description: 'Maximum active job listings allowed per farmer',
      },
      {
        key: 'featured_job_price_inr',
        value: 499,
        type: 'number',
        category: PLATFORM_SETTING_CATEGORY.PAYMENTS,
        description: 'Price in INR for featuring a job for 7 days',
      },
      {
        key: 'trust_score_threshold_verified',
        value: 30,
        type: 'number',
        category: PLATFORM_SETTING_CATEGORY.VERIFICATION,
        description: 'Minimum trust score required for VERIFIED status (System A)',
      },
      {
        key: 'trust_score_weights',
        value: {
          mobile: 15,
          email: 10,
          profile: 15,
          certificates: 20,
          completedJobs: 20,
          ratings: 20,
        },
        type: 'json',
        category: PLATFORM_SETTING_CATEGORY.VERIFICATION,
        description: 'Configurable signal weights for System A Trust Score engine',
      },
      {
        key: 'trust_level_thresholds',
        value: {
          TOP_RATED: 85,
          TRUSTED: 70,
          SKILLED: 50,
          VERIFIED: 30,
          BASIC: 0,
        },
        type: 'json',
        category: PLATFORM_SETTING_CATEGORY.VERIFICATION,
        description: 'Configurable score thresholds for System A Trust Levels',
      },
      {
        key: 'aadhaar_kyc_expiry_days',
        value: 365,
        type: 'number',
        category: PLATFORM_SETTING_CATEGORY.VERIFICATION,
        description: 'Validity duration in days for Aadhaar e-KYC (System B)',
      },
    ];

    for (const s of defaultSettings) {
      await PlatformSetting.findOneAndUpdate(
        { key: s.key },
        { ...s, updatedBy: adminUser._id },
        { upsert: true, new: true }
      );
    }
    console.log('Seeded default platform settings.');

    console.log('\n========================================');
    console.log('Admin Seeding Completed Successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during admin seeding:', err);
    process.exit(1);
  }
};

seedAdminAndSettings();
