process.env.NODE_ENV = 'test';
import { connectDB, disconnectDB } from '../config/db.js';
import { DealerAuthService } from '../services/dealerAuthService.js';
import { DealerService } from '../services/dealerService.js';
import { OrderEngineService } from '../services/orderEngineService.js';

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

async function runTestSuite() {
  console.log('\n🧪 ========================================================');
  console.log('🧪 RUNNING KABADIDEALER PARTNER BACKEND TEST SUITE');
  console.log('🧪 ========================================================\n');

  try {
    // 1. Connect DB
    await connectDB();

    // 2. Auth Flow
    console.log('--- 1. Dealer Authentication Tests ---');
    const phone = '+919988776655';
    const otpRes = await DealerAuthService.requestOtp(phone);
    assert(!!otpRes.message, 'Dealer request OTP responds with success');

    const authRes = await DealerAuthService.verifyOtpAndLogin(
      phone,
      '1234',
      'Test Scrap Center',
      'Test Collector'
    );
    assert(!!authRes.accessToken, 'Verify OTP returns JWT Access Token');
    assert(!!authRes.dealer.dealerId, `Dealer registered with ID: ${authRes.dealer.dealerId}`);

    const dealerId = authRes.dealer.dealerId;

    // 3. Location & Availability
    console.log('\n--- 2. Dealer Location & Active/Offline Status Tests ---');
    const locRes = await DealerService.updateLocation(
      dealerId,
      [77.2150, 28.6250],
      'Plot 44, Recycling Estate, Barakhamba, New Delhi',
      'Near Metro Pillar 12'
    );
    assert(!!locRes?.location?.coordinates, 'Updated dealer working location with coordinates');

    const onlineRes = await DealerService.setOnlineStatus(dealerId, true);
    assert(onlineRes?.isOnline === true, 'Turned dealer status to ONLINE');

    const profileRes = await DealerService.updateProfile(dealerId, {
      businessName: 'GreenEarth Premier Scrap Hub',
      contactPerson: 'Arun Sharma',
      profileImage: 'data:image/png;base64,dealer-photo-sample',
      email: 'arun@greenearth.com',
      isProfileCompleted: true,
      vehicleType: 'Electric Auto Loader 1000kg',
    });
    assert(profileRes?.contactPerson === 'Arun Sharma', 'Updated dealer contact person');
    assert(profileRes?.profileImage === 'data:image/png;base64,dealer-photo-sample', 'Updated dealer profile image');
    assert(profileRes?.isProfileCompleted === true, 'Marked dealer profile as completed');

    // 4. Material Prices Management
    console.log('\n--- 3. Material Price Management Tests ---');
    const updatedRates = await DealerService.updateScrapRates(dealerId, [
      { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 15, minQuantityKg: 5 },
      { category: 'Metal', name: 'Iron / Steel Scrap', unit: 'kg', pricePerKg: 35, minQuantityKg: 5 },
      { category: 'Copper', name: 'Pure Copper Wire', unit: 'kg', pricePerKg: 495, minQuantityKg: 0.5 },
    ]);
    assert(updatedRates?.scrapRates.length === 3, 'Updated dealer buying prices list');

    // 5. Dealer Discovery API
    console.log('\n--- 4. Public Dealer Discovery API Tests ---');
    const nearby = await DealerService.getNearbyActiveDealers(28.6250, 77.2150, 15);
    assert(nearby.length > 0, `Discovered ${nearby.length} active dealers for consumers`);
    assert(nearby[0].dealerId === dealerId, 'Discovery returned our active dealer');

    // 6. Incoming Pickup Request & State Transitions
    console.log('\n--- 5. Incoming Pickup Booking & Order State Engine Tests ---');
    const testOrderId = `KBD-20260910-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = await OrderEngineService.ingestNewPickupRequest({
      orderId: testOrderId,
      dealerId,
      consumerId: 'USR-CONSUMER-1234',
      customerName: 'Aman Verma',
      customerPhone: '+91 98765 00000',
      pickupAddress: 'House 42, Green Park Main, New Delhi',
      pickupLocation: [77.2020, 28.5600],
      selectedMaterials: [
        { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 15, estimatedWeightKg: 10, calculatedAmount: 150 },
        { category: 'Metal', name: 'Iron / Steel Scrap', unit: 'kg', pricePerKg: 35, estimatedWeightKg: 10, calculatedAmount: 350 },
      ],
      estimatedTotalAmount: 500,
      otpCode: '4827',
    });

    assert(newOrder.status === 'PENDING', 'Incoming order starts in PENDING status');
    assert(!!newOrder.expiresAt, 'Incoming request contains expiration timestamp');

    // Accept Order
    const acceptedOrder = await OrderEngineService.acceptOrder(testOrderId, dealerId);
    assert(acceptedOrder.status === 'ACCEPTED', 'Status transitioned to ACCEPTED');

    // Start Trip (En Route)
    const enRouteOrder = await OrderEngineService.startTrip(testOrderId, dealerId);
    assert(enRouteOrder.status === 'DEALER_EN_ROUTE', 'Status transitioned to DEALER_EN_ROUTE');

    // Stream Live GPS
    const gpsOrder = await OrderEngineService.updateLiveLocation(
      testOrderId,
      dealerId,
      [77.2080, 28.5800],
      45,
      25
    );
    assert(!!gpsOrder.dealerLiveLocation?.coordinates, 'Live GPS coordinates updated');

    // Mark Arrived
    const arrivedOrder = await OrderEngineService.markArrived(testOrderId, dealerId);
    assert(arrivedOrder.status === 'ARRIVED', 'Status transitioned to ARRIVED');

    // Verify OTP
    const verifiedOrder = await OrderEngineService.verifyPickupOtp(testOrderId, dealerId, '4827');
    assert(verifiedOrder.status === 'OTP_VERIFIED', 'Status transitioned to OTP_VERIFIED');
    assert(verifiedOrder.isOtpVerified === true, 'OTP marked as verified');

    // Complete Order with Final Weighment
    const completedOrder = await OrderEngineService.completeOrder(
      testOrderId,
      dealerId,
      [
        { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 15, actualWeightKg: 12, finalAmount: 180 },
        { category: 'Metal', name: 'Iron / Steel Scrap', unit: 'kg', pricePerKg: 35, actualWeightKg: 15, finalAmount: 525 },
      ],
      705
    );
    assert(completedOrder.status === 'COMPLETED', 'Status transitioned to COMPLETED');
    assert(completedOrder.finalTotalAmount === 705, `Final scrap payout recorded: ₹${completedOrder.finalTotalAmount}`);

    // 7. Order History
    console.log('\n--- 6. Dealer Order History Tests ---');
    const history = await OrderEngineService.getDealerOrderHistory(dealerId);
    assert(history.orders.length >= 1, `Order history contains ${history.orders.length} order(s)`);
    assert(history.orders[0].orderId === testOrderId, 'Order history sorted by latest completed pickup');

    console.log('\n========================================================');
    console.log(`📊 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('========================================================\n');

    await disconnectDB();

    if (passedTests === totalTests) {
      console.log('🎉 ALL KABADIDEALER BACKEND TESTS PASSED SUCCESSFULLY!\n');
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

runTestSuite();
