import { Dealer } from '../models/Dealer.js';

export const initialDealers: any[] = [];

export const seedInitialDealers = async (): Promise<void> => {
  try {
    // Purge any and all dummy dealers from database
    const result = await Dealer.deleteMany({
      $or: [
        { dealerId: { $in: ['DLR-BLR-001', 'DLR-RAMESH-001', 'DLR-SURESH-002', 'DLR-530794'] } },
        { businessName: { $in: ['GreenEarth Scrap Hub', 'Ramesh Green Recycling', 'Verma Scrap & Metals', 'Arun Scrap Traders'] } },
      ],
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Purged ${result.deletedCount} dummy dealer(s) from Kabadidealer DB.`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Failed to seed/purge initial dealers: ${err.message}`);
  }
};
