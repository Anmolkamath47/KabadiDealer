import { createServer } from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { seedInitialDealers } from './utils/seedData.js';
import { initSocketServer } from './sockets/socketManager.js';

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();
    await seedInitialDealers();

    // 2. Create HTTP & Socket.IO server
    const httpServer = createServer(app);
    initSocketServer(httpServer);

    // 3. Start listening on Port 5001
    httpServer.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🚛  KABADIDEALER - DEALER & DRIVER BACKEND API SERVER           ║
║                                                                   ║
║   🚀 Port:              ${config.port}                                      ║
║   🌐 API Base:          http://localhost:${config.port}/api                 ║
║   🔌 Socket.IO:         http://localhost:${config.port}                     ║
║   🌿 Environment:       ${config.nodeEnv}                               ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Kabadidealer Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
