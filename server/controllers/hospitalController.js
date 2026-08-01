const supabaseService = require('../services/supabaseService');
const hospitalScoringService = require('../services/hospitalScoringService');

/**
 * Controller for POST /api/hospitals/rank (Layer 2 Endpoint)
 */
async function rankHospitalsEndpoint(req, res) {
  try {
    const { requirement_payload, patient_location } = req.body || {};

    // Validate Input Payload
    if (!requirement_payload || !patient_location) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Missing requirement_payload or patient_location in request body'
      });
    }

    if (
      typeof patient_location.lat !== 'number' ||
      typeof patient_location.lng !== 'number'
    ) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'patient_location must contain numeric lat and lng properties'
      });
    }

    // Step 1: Query Database (Supabase or In-Memory fallback)
    const { data: rawHospitals, source } = await supabaseService.fetchHospitalsFromDB();

    // Steps 2, 3, 4: Hard Constraint Filter, Mathematical Scoring, Top-K Selection
    const result = hospitalScoringService.rankHospitals(
      rawHospitals,
      requirement_payload,
      patient_location
    );

    // Return HTTP 200 with result payload
    return res.status(200).json({
      ...result,
      db_source: source
    });
  } catch (error) {
    console.error('Error in rankHospitalsEndpoint:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to process hospital match scoring',
      error: error.message
    });
  }
}

/**
 * Controller for GET /api/hospitals (Retrieve all raw hospitals in database)
 */
async function getRawHospitals(req, res) {
  try {
    const { data, source } = await supabaseService.fetchHospitalsFromDB();
    return res.status(200).json({
      status: 'SUCCESS',
      source,
      count: data.length,
      hospitals: data
    });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
}

/**
 * Controller for Piece 1: POST /api/hospitals/reserve (Patient Side Token Creation)
 */
async function reserveBedEndpoint(req, res) {
  try {
    const { hospital_id, patient_condition, urgency_level, blood_group } = req.body || {};

    if (!hospital_id) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Missing hospital_id in request body'
      });
    }

    const result = await supabaseService.createReservationInDB({
      hospital_id,
      patient_condition: patient_condition || 'Emergency Admission',
      urgency_level: urgency_level || 'CRITICAL_LEVEL_1',
      blood_group: blood_group || 'O_NEG'
    });

    return res.status(200).json({
      status: result.status,
      lock_token: result.lock_token,
      reservation_id: result.reservation_id,
      expires_in: result.expires_in
    });
  } catch (error) {
    console.error('Error in reserveBedEndpoint:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to create reservation lock token',
      error: error.message
    });
  }
}

/**
 * Controller for Piece 2: POST /api/hospital/confirm-reservation (Hospital Side Bed Deduction)
 */
async function confirmReservationEndpoint(req, res) {
  try {
    const { reservation_id } = req.body || {};

    if (!reservation_id) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Missing reservation_id in request body'
      });
    }

    const result = await supabaseService.confirmReservationInDB({ reservation_id });

    return res.status(200).json({
      status: result.status,
      message: result.message,
      updated_icu_beds: result.updated_icu_beds
    });
  } catch (error) {
    console.error('Error in confirmReservationEndpoint:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to confirm reservation and deduct bed',
      error: error.message
    });
  }
}

module.exports = {
  rankHospitalsEndpoint,
  getRawHospitals,
  reserveBedEndpoint,
  confirmReservationEndpoint
};

