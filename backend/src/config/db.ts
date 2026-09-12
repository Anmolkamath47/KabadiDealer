import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import { config } from './index.js';

let mongod: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    const isTest = process.env.NODE_ENV === 'test';
    const dbDir = path.resolve(process.cwd(), '.db_data');

    if (!isTest && !fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (config.useMemoryDb || isTest) {
      if (isTest) {
        console.log('⚡ Initializing isolated in-memory test MongoDB instance for Kabadidealer...');
        mongod = await MongoMemoryServer.create();
      } else {
        console.log(`⚡ Initializing persistent database engine for Kabadidealer at ${dbDir}...`);
        mongod = await MongoMemoryServer.create({
          instance: {
            dbPath: dbDir,
            storageEngine: 'wiredTiger',
          },
        });
      }
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`✅ Kabadidealer MongoDB Connected (${isTest ? 'Test Memory Server' : 'Persistent Storage Engine'}): ${uri}`);
      return;
    }

    try {
      console.log(`Connecting to Kabadidealer MongoDB at: ${config.mongoUri}`);
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log('✅ Connected to Kabadidealer MongoDB server');
    } catch (err) {
      console.warn('⚠️ Local MongoDB connection failed. Falling back to persistent database engine...');
      mongod = await MongoMemoryServer.create({
        instance: {
          dbPath: dbDir,
          storageEngine: 'wiredTiger',
        },
      });
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`✅ Kabadidealer MongoDB Connected (Persistent Storage Fallback): ${uri}`);
    }
  } catch (error) {
    console.error('❌ Kabadidealer MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
  } catch (err) {
    console.error('Error during Kabadidealer DB disconnect:', err);
  }
};

// Graceful cleanup on server shutdown
process.once('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});
