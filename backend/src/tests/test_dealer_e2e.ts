import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

async function testDealerFlow() {
  console.log('🚀 Starting end-to-end dealer onboarding & live navigation test...');

  const phone = '+919911223344';
  
  // 1. Request OTP
  console.log('1. Requesting OTP...');
  const otpRes = await axios.post(`${BASE_URL}/auth/send-otp`, { phone });
  console.log('✅ OTP requested:', otpRes.data);

  // 2. Verify OTP
  console.log('2. Verifying OTP (using default test/demo OTP)...');
  const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, {
    phone,
    otp: '1234',
  });
  console.log('✅ OTP Verified:', verifyRes.data.success);
  const { accessToken, dealer } = verifyRes.data.data;
  console.log('Initial dealer profile completed status:', dealer.isProfileCompleted);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 3. Update Location (Step 1 of Onboarding)
  console.log('3. Updating operating location...');
  const locRes = await axios.put(
    `${BASE_URL}/dealers/location`,
    {
      coordinates: [77.2185, 28.6312],
      address: 'Shop 14, Main Scrap Market, Sector 12, New Delhi',
      landmark: 'Near Metro Station',
    },
    { headers: authHeaders }
  );
  console.log('✅ Operating location updated:', locRes.data.data.address);

  // 4. Update Profile (Step 2 of Onboarding)
  console.log('4. Updating profile details (Arun Scrap Traders)...');
  const profileRes = await axios.patch(
    `${BASE_URL}/dealers/profile`,
    {
      businessName: 'Arun Scrap Traders',
      contactPerson: 'Arun Kumar',
      email: 'arun.dealer@gmail.com',
      vehicleType: 'Electric Scrap Loader',
      vehicleNumber: 'DL 1R 8892',
      activeRadiusKm: 10,
      isProfileCompleted: true,
    },
    { headers: authHeaders }
  );
  console.log('✅ Profile updated:', profileRes.data.data);

  // 5. Fetch updated profile
  console.log('5. Fetching updated profile...');
  const meRes = await axios.get(`${BASE_URL}/dealers/profile`, { headers: authHeaders });
  const updatedDealer = meRes.data.data;
  console.log('✅ Updated Profile:', {
    businessName: updatedDealer.businessName,
    contactPerson: updatedDealer.contactPerson,
    email: updatedDealer.email,
    vehicleType: updatedDealer.vehicleType,
    vehicleNumber: updatedDealer.vehicleNumber,
    isProfileCompleted: updatedDealer.isProfileCompleted,
    location: updatedDealer.location.address,
  });

  const expectedInitialLetter = updatedDealer.contactPerson.charAt(0).toUpperCase();
  console.log(`✅ Avatar letter fallback: "${expectedInitialLetter}" (for "${updatedDealer.contactPerson}")`);

  if (updatedDealer.isProfileCompleted === true && expectedInitialLetter === 'A') {
    console.log('🎉 ALL DEALER ONBOARDING & PROFILE VERIFICATIONS PASSED SUCCESSFULLY!');
  } else {
    throw new Error('Verification failed!');
  }
}

testDealerFlow().catch((err) => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
