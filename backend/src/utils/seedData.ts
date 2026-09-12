import { Dealer } from '../models/Dealer.js';

export const initialDealers = [
  {
    dealerId: 'DLR-RAMESH-001',
    phone: '9876543210',
    businessName: 'Ramesh Green Recycling',
    contactPerson: 'Ramesh Kumar',
    isOnline: true,
    isBusy: false,
    rating: 4.9,
    totalRatings: 142,
    activeRadiusKm: 15,
    location: {
      type: 'Point' as const,
      coordinates: [77.2150, 28.6250] as [number, number],
      address: 'Plot 44, Recycling Estate, Connaught Place, New Delhi - 110001',
      landmark: 'Near Metro Pillar 12',
    },
    vehicleType: 'Electric Mini Loader 800kg',
    vehicleNumber: 'DL 1AA 1234',
    scrapRates: [
      { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 14, minQuantityKg: 5, icon: 'newspaper' },
      { category: 'Paper', name: 'Books & Notebooks', unit: 'kg', pricePerKg: 12, minQuantityKg: 5, icon: 'book' },
      { category: 'Cardboard', name: 'Corrugated Cardboard (Gatta)', unit: 'kg', pricePerKg: 10, minQuantityKg: 5, icon: 'box' },
      { category: 'Plastic', name: 'Hard Plastics / Buckets / Mugs', unit: 'kg', pricePerKg: 16, minQuantityKg: 2, icon: 'wine' },
      { category: 'Plastic', name: 'PET Bottles (Water / Soda)', unit: 'kg', pricePerKg: 20, minQuantityKg: 2, icon: 'bottle' },
      { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 34, minQuantityKg: 5, icon: 'wrench' },
      { category: 'Aluminium', name: 'Aluminium Cans & Utensils', unit: 'kg', pricePerKg: 145, minQuantityKg: 1, icon: 'utensils' },
      { category: 'Copper', name: 'Pure Copper Wire (Taamba)', unit: 'kg', pricePerKg: 490, minQuantityKg: 0.5, icon: 'zap' },
      { category: 'Brass', name: 'Brass Items (Peetal)', unit: 'kg', pricePerKg: 340, minQuantityKg: 0.5, icon: 'shield' },
      { category: 'E-Waste', name: 'Old Electronics & CPU Boards', unit: 'kg', pricePerKg: 55, minQuantityKg: 1, icon: 'cpu' },
      { category: 'Glass', name: 'Glass Bottles', unit: 'kg', pricePerKg: 4, minQuantityKg: 5, icon: 'wine' },
    ],
  },
  {
    dealerId: 'DLR-SURESH-002',
    phone: '9876543211',
    businessName: 'Verma Scrap & Metals',
    contactPerson: 'Suresh Verma',
    isOnline: true,
    isBusy: false,
    rating: 4.7,
    totalRatings: 89,
    activeRadiusKm: 15,
    location: {
      type: 'Point' as const,
      coordinates: [77.1900, 28.6500] as [number, number],
      address: 'Shop 18, Metal Market, Karol Bagh, New Delhi - 110005',
      landmark: 'Opposite Metro Station',
    },
    vehicleType: 'Tata Ace Scrap Hauler',
    vehicleNumber: 'DL 1BB 5678',
    scrapRates: [
      { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 15, minQuantityKg: 5, icon: 'newspaper' },
      { category: 'Cardboard', name: 'Corrugated Cardboard (Gatta)', unit: 'kg', pricePerKg: 11, minQuantityKg: 5, icon: 'box' },
      { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 35, minQuantityKg: 5, icon: 'wrench' },
      { category: 'Aluminium', name: 'Aluminium Cans & Utensils', unit: 'kg', pricePerKg: 140, minQuantityKg: 1, icon: 'utensils' },
      { category: 'Copper', name: 'Pure Copper Wire (Taamba)', unit: 'kg', pricePerKg: 485, minQuantityKg: 0.5, icon: 'zap' },
      { category: 'Brass', name: 'Brass Items (Peetal)', unit: 'kg', pricePerKg: 335, minQuantityKg: 0.5, icon: 'shield' },
      { category: 'Plastic', name: 'PET Bottles (Water / Soda)', unit: 'kg', pricePerKg: 18, minQuantityKg: 2, icon: 'bottle' },
    ],
  },
];

export const seedInitialDealers = async (): Promise<void> => {
  try {
    for (const dealer of initialDealers) {
      await Dealer.updateOne(
        { dealerId: dealer.dealerId },
        { $setOnInsert: dealer },
        { upsert: true }
      );
    }
    console.log(`✅ Seeded/verified default scrap dealers in Kabadidealer DB.`);
  } catch (err: any) {
    console.warn(`⚠️ Failed to seed initial dealers: ${err.message}`);
  }
};
