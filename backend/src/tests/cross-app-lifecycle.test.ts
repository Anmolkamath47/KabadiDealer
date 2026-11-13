import axios from 'axios';
import { config } from '../config/index.js';

const KABADIWALA_API = config.kabadiwalaApiUrl; // process.env.KABADIWALA_API_URL || 'http://localhost:5000/api'
const KABADIDEALER_API = `http://localhost:${config.port}/api`;

let passedTests = 0;
let totalTests = 0;

const assert = (condition: boolean, testName: string, detail?: string) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLifecycleTests() {
  console.log('\n🧪 ========================================================');
  console.log('🧪 KABADIDEALER ⟷ KABADIWALA ORDER LIFECYCLE TEST');
  console.log('🧪 Target Kabadidealer API:', KABADIDEALER_API);
  console.log('🧪 Target Kabadiwala API:  ', KABADIWALA_API);
  console.log('🧪 ========================================================\n');

  try {
    // 0. Setup: Authenticate Dealer and Consumer
    console.log('--- 0. Authentication Setup ---');
    const dealerPhone = '9876543210';
    await axios.post(`${KABADIDEALER_API}/auth/send-otp`, { phone: dealerPhone });
    const dealerAuthRes = await axios.post(`${KABADIDEALER_API}/auth/verify-otp`, {
      phone: dealerPhone,
      otp: '1234',
    });
    const dealerToken = dealerAuthRes.data.data.accessToken;
    const dealerId = dealerAuthRes.data.data.dealer.dealerId;
    const dealerHeaders = { Authorization: `Bearer ${dealerToken}` };
    assert(!!dealerToken, `Dealer authenticated on Kabadidealer (${dealerId})`);

    const consumerPhone = '+919988112233';
    await axios.post(`${KABADIWALA_API}/auth/send-otp`, { phone: consumerPhone });
    const consumerAuthRes = await axios.post(`${KABADIWALA_API}/auth/verify-otp`, {
      phone: consumerPhone,
      otp: '1234',
      name: 'Priya Patel',
    });
    const consumerToken = consumerAuthRes.data.data.accessToken;
    const consumerHeaders = { Authorization: `Bearer ${consumerToken}` };
    assert(!!consumerToken, 'Consumer authenticated on Kabadiwala API');

    // ========================================================
    // 1. Receive new pickup request (via Kabadiwala Booking / Internal Webhook)
    // ========================================================
    console.log('\n--- 1. Receive New Pickup Request ---');
    const bookingRes = await axios.post(
      `${KABADIWALA_API}/orders`,
      {
        dealerId,
        pickupAddress: 'Tower 4, Green Park Society, New Delhi',
        pickupCoordinates: [77.2020, 28.5600],
        selectedMaterials: [
          { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', estimatedWeightKg: 20 },
          { category: 'Plastic', name: 'PET Bottles (Water / Soda)', unit: 'kg', estimatedWeightKg: 8 },
        ],
        notes: 'Doorbell is on the right side',
      },
      { headers: consumerHeaders }
    );
    assert(bookingRes.status === 201, 'Kabadiwala created booking');
    const orderId = bookingRes.data.data.orderId;
    const otpCode = bookingRes.data.data.otp.code;
    assert(!!orderId && orderId.startsWith('KBD-'), `Order ID: ${orderId}`);
    assert(!!otpCode && otpCode.length === 4, `Pickup OTP: ${otpCode}`);

    await sleep(600);

    // Verify Kabadidealer received the request
    const dealerOrderRes = await axios.get(`${KABADIDEALER_API}/orders/${orderId}`, {
      headers: dealerHeaders,
    });
    assert(dealerOrderRes.status === 200, 'Kabadidealer ingested new pickup request');
    assert(dealerOrderRes.data.data.status === 'PENDING', 'Order is in PENDING status for dealer');

    // ========================================================
    // 2. Accept pickup
    // ========================================================
    console.log('\n--- 2. Accept Pickup ---');
    const acceptRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/accept`,
      {},
      { headers: dealerHeaders }
    );
    assert(acceptRes.status === 200, 'Dealer accepted order in Kabadidealer');
    assert(acceptRes.data.data.status === 'ACCEPTED', 'Kabadidealer status is ACCEPTED');

    await sleep(600);

    // 9a. Verify Kabadiwala was notified
    const kabadiwalaAfterAccept = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      kabadiwalaAfterAccept.data.data.status === 'ACCEPTED',
      'Kabadiwala was notified and updated status to ACCEPTED'
    );

    // ========================================================
    // 4. Update pickup status (DEALER_EN_ROUTE)
    // ========================================================
    console.log('\n--- 4. Update Pickup Status (DEALER_EN_ROUTE) ---');
    const startTripRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/start-trip`,
      {},
      { headers: dealerHeaders }
    );
    assert(startTripRes.status === 200, 'Kabadidealer updated to DEALER_EN_ROUTE');

    await sleep(600);

    // 9b. Verify Kabadiwala was notified
    const kabadiwalaEnRoute = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      kabadiwalaEnRoute.data.data.status === 'DEALER_EN_ROUTE',
      'Kabadiwala was notified and updated status to DEALER_EN_ROUTE'
    );

    // ========================================================
    // 5. Send dealer live location
    // ========================================================
    console.log('\n--- 5. Send Dealer Live GPS Location ---');
    const gpsRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/location`,
      {
        coordinates: [77.2060, 28.5700],
        heading: 120,
        speed: 28,
      },
      { headers: dealerHeaders }
    );
    assert(gpsRes.status === 200, 'Kabadidealer recorded live GPS location');

    await sleep(600);

    // 9c. Verify Kabadiwala received the live GPS coordinates
    const kabadiwalaGps = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      kabadiwalaGps.data.data.dealerLiveLocation?.coordinates[0] === 77.2060,
      'Kabadiwala received and saved dealer live coordinates [77.2060, 28.5700]'
    );
    assert(
      typeof kabadiwalaGps.data.data.dealerLiveLocation?.etaMinutes === 'number',
      `Calculated dynamic ETA: ${kabadiwalaGps.data.data.dealerLiveLocation?.etaMinutes} min`
    );

    // ========================================================
    // 6. Mark dealer arrived
    // ========================================================
    console.log('\n--- 6. Mark Dealer Arrived ---');
    const arrivedRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/arrived`,
      {},
      { headers: dealerHeaders }
    );
    assert(arrivedRes.status === 200, 'Kabadidealer updated to ARRIVED');

    await sleep(600);

    // 9d. Verify Kabadiwala was notified
    const kabadiwalaArrived = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      kabadiwalaArrived.data.data.status === 'ARRIVED',
      'Kabadiwala was notified and updated status to ARRIVED'
    );

    // ========================================================
    // 7. Verify consumer OTP
    // ========================================================
    console.log('\n--- 7. Verify Consumer OTP Handshake ---');
    const verifyOtpRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/verify-otp`,
      { otp: otpCode },
      { headers: dealerHeaders }
    );
    assert(verifyOtpRes.status === 200, 'Kabadidealer verified OTP');
    assert(verifyOtpRes.data.data.isOtpVerified === true, 'Kabadidealer marked isOtpVerified = true');

    await sleep(600);

    // 9e. Verify Kabadiwala was notified of OTP verification
    const kabadiwalaOtpVerified = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      kabadiwalaOtpVerified.data.data.status === 'OTP_VERIFIED',
      'Kabadiwala transitioned to OTP_VERIFIED'
    );
    assert(
      kabadiwalaOtpVerified.data.data.otp.isVerified === true,
      'Kabadiwala marked OTP isVerified = true'
    );

    // ========================================================
    // 8. Complete pickup
    // ========================================================
    console.log('\n--- 8. Complete Pickup with Weighment Breakdown ---');
    const finalWeighedItems = [
      {
        category: 'Paper',
        name: 'Newspaper (Raddi)',
        unit: 'kg',
        pricePerKg: 14,
        actualWeightKg: 22,
        finalAmount: 308,
      },
      {
        category: 'Plastic',
        name: 'PET Bottles (Water / Soda)',
        unit: 'kg',
        pricePerKg: 20,
        actualWeightKg: 10,
        finalAmount: 200,
      },
    ];
    const totalPayout = 508;

    const completeRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/complete`,
      {
        finalWeights: finalWeighedItems,
        finalTotalAmount: totalPayout,
      },
      { headers: dealerHeaders }
    );
    assert(completeRes.status === 200, 'Kabadidealer completed order');
    assert(completeRes.data.data.status === 'COMPLETED', 'Kabadidealer status is COMPLETED');
    assert(completeRes.data.data.finalTotalAmount === totalPayout, `Final payout recorded: ₹${totalPayout}`);

    await sleep(600);

    // 9f. Verify Kabadiwala was notified with final receipt
    const kabadiwalaCompleted = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      kabadiwalaCompleted.data.data.status === 'COMPLETED',
      'Kabadiwala was notified and marked order COMPLETED'
    );
    assert(
      kabadiwalaCompleted.data.data.finalTotalAmount === totalPayout,
      `Kabadiwala consumer invoice total matches payout (₹${totalPayout})`
    );

    // ========================================================
    // 3. Reject pickup (Tested on a second order to ensure full branch coverage)
    // ========================================================
    console.log('\n--- 3. Reject Pickup Branch Test ---');
    const order2Res = await axios.post(
      `${KABADIWALA_API}/orders`,
      {
        dealerId,
        pickupAddress: 'Sector 15, Rohini, New Delhi',
        pickupCoordinates: [77.1200, 28.7100],
        selectedMaterials: [
          { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', estimatedWeightKg: 30 },
        ],
        notes: 'Heavy scrap grill',
      },
      { headers: consumerHeaders }
    );
    const order2Id = order2Res.data.data.orderId;
    await sleep(600);

    const rejectRes = await axios.post(
      `${KABADIDEALER_API}/orders/${order2Id}/reject`,
      { reason: 'Dealer vehicle currently full' },
      { headers: dealerHeaders }
    );
    assert(rejectRes.status === 200, 'Kabadidealer successfully rejected pickup');

    await sleep(600);

    const kabadiwalaOrder2 = await axios.get(`${KABADIWALA_API}/orders/${order2Id}`, {
      headers: consumerHeaders,
    });
    assert(
      kabadiwalaOrder2.data.data.status === 'REJECTED',
      'Kabadiwala was notified and updated status to REJECTED'
    );

    console.log('\n========================================================');
    console.log(`📊 LIFECYCLE TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('========================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL 9 LIFECYCLE REQUIREMENTS VERIFIED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Lifecycle test execution failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runLifecycleTests();
