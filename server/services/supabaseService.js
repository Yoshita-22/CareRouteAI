// Supabase Service with In-Memory Mock Fallback for Layer 2 Hospital Database
const { createClient } = require('@supabase/supabase-js');

// Default Seed Hospitals matching exact user Supabase Table Schema & Data
const MOCK_SUPABASE_HOSPITALS = [
  {
    id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    name: "Apollo Health City (Jubilee Hills)",
    latitude: 17.4258,
    longitude: 78.4116,
    icu_beds: 5,
    blood_stock: { O_NEG: 4, A_POS: 12, B_POS: 8, AB_NEG: 2 },
    equipment: ["VENTILATOR", "ECMO", "CT_SCANNER", "CATH_LAB", "DIALYSIS"],
    specialists: ["TRAUMA_SURGEON", "NEUROSURGEON", "CARDIOLOGIST"]
  },
  {
    id: "a4c2f1e8-1122-3344-5566-778899aabbcc",
    name: "Care Hospitals (Hitec City)",
    latitude: 17.4401,
    longitude: 78.3789,
    icu_beds: 2,
    blood_stock: { O_NEG: 1, A_POS: 4, B_POS: 6, AB_NEG: 0 },
    equipment: ["VENTILATOR", "ECMO", "DEFIBRILLATOR"],
    specialists: ["NEUROSURGEON", "PULMONOLOGIST"]
  },
  {
    id: "c7d8e9f0-3344-5566-7788-9900aabbccdd",
    name: "Yashoda Hospitals (Hitec City)",
    latitude: 17.4512,
    longitude: 78.3810,
    icu_beds: 6,
    blood_stock: { O_NEG: 2, A_POS: 15, B_POS: 10, AB_NEG: 1 },
    equipment: ["VENTILATOR", "CT_SCANNER", "DIALYSIS", "CATH_LAB"],
    specialists: ["CARDIOLOGIST", "TRAUMA_SURGEON"]
  },
  {
    id: "d8e9f0a1-4455-6677-8899-00aabbccdd11",
    name: "Medicover Hospitals (Madhapur)",
    latitude: 17.4475,
    longitude: 78.3762,
    icu_beds: 1,
    blood_stock: { O_NEG: 0, A_POS: 8, B_POS: 5, AB_NEG: 0 }, // No O_NEG Blood (Tests Blood Filter)
    equipment: ["VENTILATOR", "CT_SCANNER", "DEFIBRILLATOR"],
    specialists: ["GENERAL_SURGEON", "PULMONOLOGIST"]
  },
  {
    id: "e9f0a1b2-5566-7788-9900-11bbccdd2233",
    name: "KIMS Hospital (Gachibowli)",
    latitude: 17.4436,
    longitude: 78.3614,
    icu_beds: 0, // 0 ICU Beds (Tests Hard Constraint Bed Exclusion Filter)
    blood_stock: { O_NEG: 3, A_POS: 5, B_POS: 2, AB_NEG: 0 },
    equipment: ["VENTILATOR", "DIALYSIS"],
    specialists: ["TRAUMA_SURGEON"]
  },
  {
    id: "f0a1b2c3-6677-8899-0011-22ccdd334455",
    name: "Continental Hospitals (Gachibowli)",
    latitude: 17.4211,
    longitude: 78.3381,
    icu_beds: 4,
    blood_stock: { O_NEG: 3, A_POS: 10, B_POS: 7, AB_NEG: 3 },
    equipment: ["VENTILATOR", "ECMO", "CT_SCANNER", "DIALYSIS", "CATH_LAB"],
    specialists: ["CARDIOLOGIST", "NEUROSURGEON", "TRAUMA_SURGEON"]
  }
];

// Initialize Supabase Client if credentials exist
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🟢 Supabase Client initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Supabase client initialization failed, falling back to mock database:', err.message);
  }
}

// In-Memory Mock Reservations Store
const MOCK_RESERVATIONS = [];

/**
 * Fetch all hospital records from Supabase table `hospitals`.
 * Falls back to mock array if Supabase is unconfigured or encounters an error.
 */
async function fetchHospitalsFromDB() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('hospitals').select('*');
      if (!error && data && data.length > 0) {
        return { data, source: 'SUPABASE_DB' };
      }
      if (error) {
        console.warn('⚠️ Supabase query error, falling back to mock dataset:', error.message);
      }
    } catch (err) {
      console.warn('⚠️ Exception querying Supabase, falling back to mock dataset:', err.message);
    }
  }

  // Fallback to in-memory store matching Supabase structure
  return {
    data: MOCK_SUPABASE_HOSPITALS,
    source: 'MOCK_STORE'
  };
}

/**
 * Piece 1: Create 15-Minute Bed Reservation Lock Token (Patient Side)
 * Inserts a new row into `reservations` table in Supabase or mock store.
 */
async function createReservationInDB({ hospital_id, patient_condition, urgency_level, blood_group }) {
  const lockToken = `LOCK-${Math.floor(100000 + Math.random() * 900000)}`;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert([
          {
            hospital_id,
            patient_condition,
            urgency_level,
            blood_group: blood_group || null,
            lock_token: lockToken,
            status: 'PENDING'
          }
        ])
        .select('*')
        .single();

      if (!error && data) {
        return {
          status: 'SUCCESS',
          lock_token: data.lock_token,
          reservation_id: data.id,
          expires_in: '15 minutes',
          hospital_id: data.hospital_id,
          db_source: 'SUPABASE_DB'
        };
      }
      if (error) {
        console.warn('⚠️ Supabase reservation insert error, using fallback:', error.message);
      }
    } catch (err) {
      console.warn('⚠️ Exception creating reservation in Supabase:', err.message);
    }
  }

  // In-Memory Fallback
  const reservationId = `res-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const newReservation = {
    id: reservationId,
    hospital_id,
    patient_condition,
    urgency_level,
    blood_group: blood_group || null,
    lock_token: lockToken,
    status: 'PENDING',
    created_at: new Date().toISOString()
  };
  MOCK_RESERVATIONS.push(newReservation);

  return {
    status: 'SUCCESS',
    lock_token: lockToken,
    reservation_id: reservationId,
    expires_in: '15 minutes',
    hospital_id,
    db_source: 'MOCK_STORE'
  };
}

/**
 * Piece 2: Bed Deduction & Confirmation (Hospital Side)
 * Decrements 1 ICU Bed from the hospital and marks reservation status as 'CONFIRMED'.
 */
async function confirmReservationInDB({ reservation_id }) {
  let targetHospitalId = null;

  if (supabase) {
    try {
      // Step 1: Find associated reservation
      const { data: resData, error: resErr } = await supabase
        .from('reservations')
        .select('hospital_id, status')
        .eq('id', reservation_id)
        .single();

      if (!resErr && resData) {
        targetHospitalId = resData.hospital_id;

        // Step 2: Fetch current ICU beds count
        const { data: hospData, error: hospErr } = await supabase
          .from('hospitals')
          .select('icu_beds')
          .eq('id', targetHospitalId)
          .single();

        if (!hospErr && hospData) {
          const newBedCount = Math.max(0, hospData.icu_beds - 1);

          // Update hospital bed count
          await supabase
            .from('hospitals')
            .update({ icu_beds: newBedCount })
            .eq('id', targetHospitalId);

          // Mark reservation status as CONFIRMED
          await supabase
            .from('reservations')
            .update({ status: 'CONFIRMED' })
            .eq('id', reservation_id);

          return {
            status: 'SUCCESS',
            message: 'Bed confirmed and deducted!',
            updated_icu_beds: newBedCount,
            hospital_id: targetHospitalId,
            db_source: 'SUPABASE_DB'
          };
        }
      }
      if (resErr) {
        console.warn('⚠️ Supabase confirm reservation error, using fallback:', resErr.message);
      }
    } catch (err) {
      console.warn('⚠️ Exception confirming reservation in Supabase:', err.message);
    }
  }

  // In-Memory Fallback
  const reservation = MOCK_RESERVATIONS.find(r => r.id === reservation_id || r.lock_token === reservation_id);
  if (reservation) {
    reservation.status = 'CONFIRMED';
    targetHospitalId = reservation.hospital_id;
  }

  // Deduct ICU Bed in Mock Hospitals Store
  let updatedBeds = 0;
  const hospital = MOCK_SUPABASE_HOSPITALS.find(h => h.id === targetHospitalId || h.id === "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d");
  if (hospital) {
    hospital.icu_beds = Math.max(0, hospital.icu_beds - 1);
    updatedBeds = hospital.icu_beds;
  }

  return {
    status: 'SUCCESS',
    message: 'Bed confirmed and deducted!',
    updated_icu_beds: updatedBeds,
    hospital_id: targetHospitalId || (hospital ? hospital.id : null),
    db_source: 'MOCK_STORE'
  };
}

// In-Memory Fallback Doctor Conversations Store
const MOCK_DOCTOR_CONVERSATIONS = [];

/**
 * Saves Patient & Doctor Conversation, Vision Analysis, and Requirement Payload into Supabase table `conversations`.
 */
async function saveDoctorConversationInDB({ patient_id, conversation_transcript, lesion_analysis, requirement_payload, patient_location }) {
  const convoRecord = {
    id: `convo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    patient_id: patient_id || 'PAT-DEMO-001',
    conversation_transcript: conversation_transcript || [],
    lesion_analysis: lesion_analysis || null,
    requirement_payload: requirement_payload || null,
    patient_location: patient_location || null,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([convoRecord])
        .select('*')
        .single();

      if (!error && data) {
        return { status: 'SUCCESS', data, db_source: 'SUPABASE_DB' };
      }
      if (error) {
        console.warn('⚠️ Supabase save conversation warning, using mock store:', error.message);
      }
    } catch (err) {
      console.warn('⚠️ Exception saving conversation to Supabase:', err.message);
    }
  }

  MOCK_DOCTOR_CONVERSATIONS.unshift(convoRecord);
  return { status: 'SUCCESS', data: convoRecord, db_source: 'MOCK_STORE' };
}

/**
 * Retrieves past doctor conversations from Supabase table `conversations` or mock store.
 */
async function getDoctorConversationsFromDB() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('conversations').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return { status: 'SUCCESS', conversations: data, db_source: 'SUPABASE_DB' };
      }
    } catch (err) {
      console.warn('⚠️ Exception fetching conversations from Supabase:', err.message);
    }
  }

  return { status: 'SUCCESS', conversations: MOCK_DOCTOR_CONVERSATIONS, db_source: 'MOCK_STORE' };
}

module.exports = {
  fetchHospitalsFromDB,
  createReservationInDB,
  confirmReservationInDB,
  saveDoctorConversationInDB,
  getDoctorConversationsFromDB,
  MOCK_SUPABASE_HOSPITALS,
  MOCK_RESERVATIONS,
  MOCK_DOCTOR_CONVERSATIONS
};


