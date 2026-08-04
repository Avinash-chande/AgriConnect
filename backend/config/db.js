import mongoose from 'mongoose';

/**
 * Connects to MongoDB database using Mongoose with event listeners & index cleanup
 */
export const connectDB = async () => {
  try {
    const connStr =
      process.env.NODE_ENV === 'test'
        ? process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/agriconnect_test_db'
        : process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agriconnect_db';

    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
      console.log('🌱 MongoDB Connection: Established successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB Connection: Disconnected');
    });

    const conn = await mongoose.connect(connStr);
    console.log(`✅ MongoDB Connected Host: ${conn.connection.host} [DB: ${conn.connection.name}]`);

    // Drop legacy conflicting indexes from prototype schemas
    const cleanIndexes = async (collectionName, indexName) => {
      try {
        await mongoose.connection.collection(collectionName).dropIndex(indexName);
        console.log(`🧹 Cleaned legacy ${indexName} index from ${collectionName} collection`);
      } catch {
        // Index did not exist or already dropped
      }
    };

    await cleanIndexes('users', 'phone_1');
    await cleanIndexes('farmerprofiles', 'user_1');
    await cleanIndexes('workerprofiles', 'user_1');

    return conn;
  } catch (error) {
    console.error('💥 Database Connection Fatal Error:', error.message);
    process.exit(1);
  }
};
