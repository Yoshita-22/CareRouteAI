const { MOCK_SUPABASE_HOSPITALS } = require('./services/supabaseService');
const { rankHospitals, calculateHaversineDistance } = require('./services/hospitalScoringService');

console.log('====================================================');
console.log('🛠️ CARE ROUTE AI — LAYER 2 AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

// ----------------------------------------------------
// TEST PAYLOAD A: Severe Trauma (Requires ICU, O_NEG Blood, ECMO)
// ----------------------------------------------------
console.log('----------------------------------------------------');
console.log('🧪 TEST CASE 1: Test Payload A — Severe Trauma Emergency');
console.log('----------------------------------------------------');

const payloadA = {
  requirement_payload: {
    urgency_level: "CRITICAL_LEVEL_1",
    detected_condition: "Severe road accident with internal hemorrhage",
    hard_requirements: {
      bed_type: "ICU",
      blood_group: "O_NEG",
      equipment: ["ECMO", "VENTILATOR"],
      specialist: "TRAUMA_SURGEON"
    }
  },
  patient_location: {
    lat: 17.4400,
    lng: 78.3480
  }
};

const resultA = rankHospitals(MOCK_SUPABASE_HOSPITALS, payloadA.requirement_payload, payloadA.patient_location);

assert(resultA.status === 'SUCCESS', 'Response status should be SUCCESS');
assert(resultA.top_candidates.length > 0, 'Top candidates list should not be empty');

// Check Rule 2 Exclusion: Medicover Hospitals has 0 units of O_NEG blood -> Must be excluded!
const medicoverFoundInA = resultA.top_candidates.some(c => c.hospital_name.includes('Medicover'));
assert(!medicoverFoundInA, 'Medicover Hospitals (0 O_NEG blood) MUST be completely excluded from results');

// Check Rule 1 Exclusion: KIMS Hospital has 0 ICU beds -> Must be excluded!
const kimsFoundInA = resultA.top_candidates.some(c => c.hospital_name.includes('KIMS'));
assert(!kimsFoundInA, 'KIMS Hospital (0 ICU beds) MUST be completely excluded from results');

console.log(`Top match for Severe Trauma: #${resultA.top_candidates[0].rank} ${resultA.top_candidates[0].hospital_name} (Score: ${resultA.top_candidates[0].match_score}, Distance: ${resultA.top_candidates[0].distance_km} km, ETA: ${resultA.top_candidates[0].estimated_eta})`);

// ----------------------------------------------------
// TEST PAYLOAD B: Cardiac Emergency (Requires ICU, null blood, VENTILATOR)
// ----------------------------------------------------
console.log('\n----------------------------------------------------');
console.log('🧪 TEST CASE 2: Test Payload B — Cardiac Emergency');
console.log('----------------------------------------------------');

const payloadB = {
  requirement_payload: {
    urgency_level: "HIGH_LEVEL_2",
    detected_condition: "Chest pain and respiratory failure",
    hard_requirements: {
      bed_type: "ICU",
      blood_group: null,
      equipment: ["VENTILATOR"],
      specialist: "CARDIOLOGIST"
    }
  },
  patient_location: {
    lat: 17.4400,
    lng: 78.3480
  }
};

const resultB = rankHospitals(MOCK_SUPABASE_HOSPITALS, payloadB.requirement_payload, payloadB.patient_location);

assert(resultB.status === 'SUCCESS', 'Response status should be SUCCESS');
// In Payload B, blood is null, so Medicover (which has 1 ICU bed & Ventilator) SHOULD be included!
const medicoverFoundInB = resultB.top_candidates.some(c => c.hospital_name.includes('Medicover'));
assert(medicoverFoundInB, 'Medicover Hospitals SHOULD be included when no blood group is requested');

// ----------------------------------------------------
// VERIFICATION CHECKLIST TESTS
// ----------------------------------------------------
console.log('\n----------------------------------------------------');
console.log('🧪 TEST CASE 3: Distance Penalty Verification (W_d * D)');
console.log('----------------------------------------------------');

const candidateClose = resultA.top_candidates.find(c => c.hospital_name.includes('Continental'));
const candidateFar = resultA.top_candidates.find(c => c.hospital_name.includes('Apollo'));

if (candidateClose && candidateFar) {
  assert(candidateClose.distance_km < candidateFar.distance_km, 'Continental should be closer than Apollo to patient location (17.4400, 78.3480)');
  assert(candidateClose._debugScoreBreakdown.W_d_D < candidateFar._debugScoreBreakdown.W_d_D, 'Closer hospital receives smaller distance penalty (W_d * D)');
}

console.log('\n----------------------------------------------------');
console.log('🧪 TEST CASE 4: Equipment Match Ratio Verification (W_e * E)');
console.log('----------------------------------------------------');

// Patient requests ["ECMO", "VENTILATOR"]
const candidateFullEquip = resultA.top_candidates.find(c => c.matched_equipment.length === 2);
const candidatePartialEquip = resultA.top_candidates.find(c => c.matched_equipment.length === 1);

if (candidateFullEquip && candidatePartialEquip) {
  assert(candidateFullEquip._debugScoreBreakdown.equipmentRatio === 1.0, 'Full equipment match ratio E should equal 1.0 (2/2)');
  assert(candidatePartialEquip._debugScoreBreakdown.equipmentRatio === 0.5, 'Partial equipment match ratio E should equal 0.5 (1/2)');
  assert(candidateFullEquip._debugScoreBreakdown.W_e_E > candidatePartialEquip._debugScoreBreakdown.W_e_E, 'Full equipment match yields higher score than partial equipment');
}

console.log('\n----------------------------------------------------');
console.log('🧪 TEST CASE 5: Piece 1 Token Creation (Patient Side)');
console.log('----------------------------------------------------');

const { createReservationInDB, confirmReservationInDB } = require('./services/supabaseService');

async function runReservationTests() {
  const targetHospitalId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
  const initialHospital = MOCK_SUPABASE_HOSPITALS.find(h => h.id === targetHospitalId);
  const initialBeds = initialHospital ? initialHospital.icu_beds : 5;

  const res1 = await createReservationInDB({
    hospital_id: targetHospitalId,
    patient_condition: "Severe internal bleeding",
    urgency_level: "CRITICAL_LEVEL_1",
    blood_group: "O_NEG"
  });

  assert(res1.status === 'SUCCESS', 'createReservationInDB status should be SUCCESS');
  assert(/^LOCK-\d{6}$/.test(res1.lock_token), `Lock token (${res1.lock_token}) must match pattern LOCK-XXXXXX`);
  assert(Boolean(res1.reservation_id), 'reservation_id must be returned');
  assert(res1.expires_in === '15 minutes', 'expires_in must equal "15 minutes"');

  console.log(`Issued Reservation Token: ${res1.lock_token} (Reservation ID: ${res1.reservation_id})`);

  console.log('\n----------------------------------------------------');
  console.log('🧪 TEST CASE 6: Piece 2 Bed Deduction & Confirmation (Hospital Side)');
  console.log('----------------------------------------------------');

  const res2 = await confirmReservationInDB({
    reservation_id: res1.reservation_id
  });

  assert(res2.status === 'SUCCESS', 'confirmReservationInDB status should be SUCCESS');
  assert(res2.message === 'Bed confirmed and deducted!', 'message must confirm bed deduction');
  assert(res2.updated_icu_beds === Math.max(0, initialBeds - 1), `ICU beds count should be decremented by 1 (expected ${Math.max(0, initialBeds - 1)}, got ${res2.updated_icu_beds})`);

  console.log(`Confirmed Reservation! ICU Beds updated to: ${res2.updated_icu_beds}`);

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests} / ${totalTests} Passed`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL LAYER 2 & PIECE 1/2 VERIFICATION CHECKS PASSED 100% SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runReservationTests();

