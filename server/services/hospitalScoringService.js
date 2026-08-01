/**
 * Layer 2 Hospital Match Scoring & Ranking Engine
 * Implementation of 4-step execution logic and mathematical scoring formula.
 */

/**
 * Calculates Haversine distance in kilometers between two geographic coordinates.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Executes Step 2 (Hard Constraints), Step 3 (Scoring Equation), and Step 4 (Top-K Selection)
 * 
 * @param {Array} hospitals Raw hospital objects from database (Supabase schema)
 * @param {Object} requirementPayload Patient requirement payload containing urgency_level, condition, hard_requirements
 * @param {Object} patientLocation Patient coordinates { lat, lng }
 */
function rankHospitals(hospitals, requirementPayload, patientLocation) {
  const { hard_requirements = {} } = requirementPayload || {};
  const { bed_type, blood_group, equipment: requestedEquipment = [], specialist } = hard_requirements;
  const { lat: pLat, lng: pLng } = patientLocation || {};

  const evaluatedHospitals = [];

  // Iterate over hospitals and apply Pass 1 (Hard Constraint Filter) & Pass 2 (Scoring Equation)
  for (const hospital of hospitals) {
    const availableBeds = hospital.icu_beds || 0;
    const bloodStockObj = hospital.blood_stock || {};
    const hospitalEquipment = Array.isArray(hospital.equipment) ? hospital.equipment : [];
    const hospitalSpecialists = Array.isArray(hospital.specialists) ? hospital.specialists : [];

    // ==========================================
    // STEP 2: Hard Constraint Filter (Pass 1)
    // ==========================================

    // Rule 1 (ICU Bed Check): If bed_type == "ICU" AND hospital.icu_beds <= 0 -> EXCLUDE HOSPITAL
    if (bed_type === 'ICU' && availableBeds <= 0) {
      continue; // Exclude hospital
    }

    // Rule 2 (Blood Availability Check): If blood_group is provided AND hospital.blood_stock[blood_group] <= 0 -> EXCLUDE HOSPITAL
    let requestedBloodUnits = 0;
    if (blood_group && blood_group.trim() !== '') {
      requestedBloodUnits = bloodStockObj[blood_group] || 0;
      if (requestedBloodUnits <= 0) {
        continue; // Exclude hospital due to missing required blood group stock
      }
    }

    // ==========================================
    // STEP 3: Mathematical Match Scoring (Pass 2)
    // Formula: Score = (W_b * B) + (W_bl * Bl) + (W_e * E) - (W_d * D)
    // ==========================================

    // 1. Bed Variable (B): 1.0 if icu_beds > 0, else 0.0. Weight = 40
    const W_b = 40;
    const B = availableBeds > 0 ? 1.0 : 0.0;

    // 2. Blood Variable (Bl): 1.0 if requested blood stock > 0 (or 1.0 if no blood requested), else 0.0. Weight = 30
    const W_bl = 30;
    let Bl = 1.0;
    if (blood_group && blood_group.trim() !== '') {
      Bl = requestedBloodUnits > 0 ? 1.0 : 0.0;
    }

    // 3. Equipment Match Ratio (E): Matched equipment count / Requested equipment count. Weight = 20
    const W_e = 20;
    let E = 1.0;
    let matchedEquipment = [];
    if (Array.isArray(requestedEquipment) && requestedEquipment.length > 0) {
      matchedEquipment = requestedEquipment.filter((item) =>
        hospitalEquipment.includes(item)
      );
      E = matchedEquipment.length / requestedEquipment.length;
    } else {
      matchedEquipment = hospitalEquipment;
    }

    // 4. Distance in Kilometers (D): Haversine distance. Weight = 3 (Subtracted per KM)
    const W_d = 3;
    const D = calculateHaversineDistance(pLat, pLng, hospital.latitude, hospital.longitude);

    // Calculate Final Match Score
    const rawScore = (W_b * B) + (W_bl * Bl) + (W_e * E) - (W_d * D);
    const matchScore = Math.round(rawScore * 10) / 10; // Round to 1 decimal place

    // ETA Estimation: ceil(Distance in KM * 2.5) minutes
    const estimatedMinutes = Math.ceil(D * 2.5);
    const estimatedEta = `${estimatedMinutes} mins`;

    evaluatedHospitals.push({
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      distance_km: Math.round(D * 10) / 10,
      estimated_eta: estimatedEta,
      match_score: matchScore,
      available_icu_beds: availableBeds,
      blood_stock_units: blood_group ? requestedBloodUnits : null,
      matched_equipment: matchedEquipment,
      specialists: hospitalSpecialists,
      _debugScoreBreakdown: {
        W_b_B: W_b * B,
        W_bl_Bl: W_bl * Bl,
        W_e_E: Math.round(W_e * E * 10) / 10,
        W_d_D: Math.round(W_d * D * 10) / 10,
        equipmentRatio: E
      }
    });
  }

  // ==========================================
  // STEP 4: Top-K Selection
  // ==========================================
  // Sort qualified hospitals by match_score descending (highest score first)
  evaluatedHospitals.sort((a, b) => b.match_score - a.match_score);

  // Take Top 5 candidate hospitals
  const top5Candidates = evaluatedHospitals.slice(0, 5).map((candidate, idx) => ({
    rank: idx + 1,
    ...candidate
  }));

  return {
    status: 'SUCCESS',
    total_matches_found: evaluatedHospitals.length,
    top_candidates: top5Candidates
  };
}

module.exports = {
  calculateHaversineDistance,
  rankHospitals
};
