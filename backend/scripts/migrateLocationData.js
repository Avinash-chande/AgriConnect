import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { Job } from '../models/Job.js';
import { createGeoPoint } from '../models/schemas/commonSchemas.js';

dotenv.config();

/**
 * Production-Ready Geospatial Database Migration & Backfill Strategy for AgriConnect
 */
export const runLocationMigration = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agriconnect_db';

  console.log('---------------------------------------------------------');
  console.log('📍 AgriConnect Geospatial Migration & Backfill Script');
  console.log('---------------------------------------------------------');
  console.log(`[Database] Connecting to: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  const stats = {
    users: { total: 0, backfilled: 0, skipped: 0 },
    farmers: { total: 0, backfilled: 0, skipped: 0 },
    workers: { total: 0, backfilled: 0, skipped: 0 },
    jobs: { total: 0, backfilled: 0, skipped: 0 },
  };

  try {
    // 1. Backfill Users
    console.log('\n--> Processing User documents...');
    const users = await User.find({ isDeleted: { $ne: true } });
    stats.users.total = users.length;

    for (const user of users) {
      let modified = false;
      if (user.address) {
        if (!user.address.country) {
          user.address.country = 'India';
          modified = true;
        }
        if (typeof user.address.longitude === 'number' && typeof user.address.latitude === 'number') {
          const point = createGeoPoint(user.address.longitude, user.address.latitude);
          if (point && JSON.stringify(user.location) !== JSON.stringify(point)) {
            user.location = point;
            modified = true;
          }
        }
      }
      if (modified) {
        await user.save();
        stats.users.backfilled++;
      } else {
        stats.users.skipped++;
      }
    }

    // 2. Backfill Farmer Profiles
    console.log('--> Processing FarmerProfile documents...');
    const farmerProfiles = await FarmerProfile.find({ isDeleted: { $ne: true } });
    stats.farmers.total = farmerProfiles.length;

    for (const farmer of farmerProfiles) {
      let modified = false;
      if (farmer.farmAddress) {
        if (!farmer.farmAddress.country) {
          farmer.farmAddress.country = 'India';
          modified = true;
        }
        if (typeof farmer.farmAddress.longitude === 'number' && typeof farmer.farmAddress.latitude === 'number') {
          const point = createGeoPoint(farmer.farmAddress.longitude, farmer.farmAddress.latitude);
          if (point && JSON.stringify(farmer.location) !== JSON.stringify(point)) {
            farmer.location = point;
            modified = true;
          }
        }
      }
      if (modified) {
        await farmer.save();
        stats.farmers.backfilled++;
      } else {
        stats.farmers.skipped++;
      }
    }

    // 3. Backfill Worker Profiles
    console.log('--> Processing WorkerProfile documents...');
    const workerProfiles = await WorkerProfile.find({ isDeleted: { $ne: true } });
    stats.workers.total = workerProfiles.length;

    for (const worker of workerProfiles) {
      let modified = false;

      // Initialize address object from preferred region if address is null
      if (!worker.address && (worker.preferredDistrict || worker.preferredState)) {
        worker.address = {
          district: worker.preferredDistrict || '',
          state: worker.preferredState || '',
          village: worker.preferredVillage || '',
          country: 'India',
        };
        modified = true;
      }

      if (worker.address) {
        if (!worker.address.country) {
          worker.address.country = 'India';
          modified = true;
        }
        if (typeof worker.address.longitude === 'number' && typeof worker.address.latitude === 'number') {
          const point = createGeoPoint(worker.address.longitude, worker.address.latitude);
          if (point && JSON.stringify(worker.location) !== JSON.stringify(point)) {
            worker.location = point;
            modified = true;
          }
        }
      }

      if (modified) {
        await worker.save();
        stats.workers.backfilled++;
      } else {
        stats.workers.skipped++;
      }
    }

    // 4. Backfill Jobs
    console.log('--> Processing Job documents...');
    const jobs = await Job.find({ isDeleted: { $ne: true } });
    stats.jobs.total = jobs.length;

    for (const job of jobs) {
      let modified = false;
      if (job.jobAddress) {
        if (!job.jobAddress.country) {
          job.jobAddress.country = 'India';
          modified = true;
        }
        if (typeof job.jobAddress.longitude === 'number' && typeof job.jobAddress.latitude === 'number') {
          const point = createGeoPoint(job.jobAddress.longitude, job.jobAddress.latitude);
          if (point && JSON.stringify(job.location) !== JSON.stringify(point)) {
            job.location = point;
            modified = true;
          }
        }
      }
      if (modified) {
        await job.save();
        stats.jobs.backfilled++;
      } else {
        stats.jobs.skipped++;
      }
    }

    // 5. Ensure 2dsphere Indexes across MongoDB Collections
    console.log('\n--> Synchronizing MongoDB 2dsphere Indexes...');
    await Promise.all([
      User.syncIndexes(),
      FarmerProfile.syncIndexes(),
      WorkerProfile.syncIndexes(),
      Job.syncIndexes(),
    ]);
    console.log('✅ 2dsphere indexes synchronized successfully across all collections.');

    console.log('\n---------------------------------------------------------');
    console.log('📊 Migration & Backfill Summary');
    console.log('---------------------------------------------------------');
    console.table({
      Users: stats.users,
      Farmers: stats.farmers,
      Workers: stats.workers,
      Jobs: stats.jobs,
    });
    console.log('---------------------------------------------------------');
    console.log('✅ Location migration completed without errors.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Auto-run script if executed directly from command line
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runLocationMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
