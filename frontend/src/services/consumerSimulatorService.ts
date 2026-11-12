import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const DEALER_SERVICE_API_KEY = 'kbad_shared_internal_secret_key_9988';

export const consumerSimulatorService = {
  /**
   * Simulate a customer booking this dealer
   */
  async triggerIncomingBooking(dealerId: string) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `KBD-20260910-${randomSuffix}`;
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const payload = {
      orderId,
      dealerId,
      consumerId: `USR-CUST-${randomSuffix}`,
      customerName: 'Aman Verma',
      customerPhone: '+91 98765 00000',
      pickupAddress: 'House 42, Green Park Main, Near Market, New Delhi - 110016',
      pickupLocation: [77.2020, 28.5600],
      selectedMaterials: [
        { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 14, estimatedWeightKg: 15, calculatedAmount: 210 },
        { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 34, estimatedWeightKg: 10, calculatedAmount: 340 },
        { category: 'Copper', name: 'Pure Copper Wire (Taamba)', unit: 'kg', pricePerKg: 490, estimatedWeightKg: 1, calculatedAmount: 490 },
      ],
      estimatedTotalAmount: 1040,
      otpCode,
      scrapPhoto: '/sample_scrap_photo.jpg',
      notes: 'Please bring certified electronic scale. Doorbell on ground floor.',
    };

    const res = await axios.post(`${API_BASE_URL}/internal/consumer-events/new-pickup`, payload, {
      headers: {
        'x-dealer-api-key': DEALER_SERVICE_API_KEY,
      },
    });

    return { ...res.data, otpCode };
  },
};
