const { dbStore } = require('../models/store');

const MAX_RADIUS_KM = 20.0; // Maximum emergency dispatch radius limit (20 KM)
const MAX_ETA_MINUTES = 30;  // Maximum travel time ETA limit (30 MIN)

// Haversine formula to calculate geographic distance in KM
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return Math.min(MAX_RADIUS_KM, Math.round(distance * 10) / 10);
}

// Calculate ETA in minutes capped at MAX 30 MIN
function calculateETA(distanceKm, speedKmh = 40) {
  const cappedDistance = Math.min(MAX_RADIUS_KM, distanceKm);
  if (cappedDistance <= 0.1) return 1;
  const timeHours = cappedDistance / speedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);
  return Math.min(MAX_ETA_MINUTES, Math.max(1, timeMinutes));
}

/**
 * Smart Ambulance Selection Algorithm (Max 20 KM & Max 30 MIN Limit)
 */
function findBestAmbulance(pickupLocation, preferredType = 'ALS') {
  // Step 1: Filter available ALS units within MAX 20 KM radius
  let candidates = dbStore.ambulances.filter((amb) => {
    if (amb.status !== 'AVAILABLE') return false;
    const dist = calculateDistance(amb.latitude, amb.longitude, pickupLocation.lat, pickupLocation.lng);
    return amb.type === preferredType && dist <= MAX_RADIUS_KM;
  });

  // Fallback: If no ALS is within 20 km, check for any available ambulance within 20 km
  let fallbackUsed = false;
  if (candidates.length === 0) {
    candidates = dbStore.ambulances.filter((amb) => {
      if (amb.status !== 'AVAILABLE') return false;
      const dist = calculateDistance(amb.latitude, amb.longitude, pickupLocation.lat, pickupLocation.lng);
      return dist <= MAX_RADIUS_KM;
    });
    fallbackUsed = true;
  }

  if (candidates.length === 0) {
    return { 
      error: `No available ambulances found within max ${MAX_RADIUS_KM} KM emergency radius limit.`, 
      code: 'NO_AMBULANCE_IN_RADIUS' 
    };
  }

  // Step 2: Compute distance and ETA for each candidate
  const ranked = candidates.map((amb) => {
    const dist = calculateDistance(
      amb.latitude,
      amb.longitude,
      pickupLocation.lat,
      pickupLocation.lng
    );
    const eta = calculateETA(dist);
    return {
      ambulance: amb,
      distance: dist,
      eta,
      score: (amb.type === 'ALS' ? 0 : 50) + dist + eta * 0.5
    };
  });

  // Step 3: Sort by priority score
  ranked.sort((a, b) => a.score - b.score);

  const bestMatch = ranked[0];
  return {
    selectedAmbulance: bestMatch.ambulance,
    distance: Math.min(MAX_RADIUS_KM, bestMatch.distance),
    eta: Math.min(MAX_ETA_MINUTES, bestMatch.eta),
    maxRadius: MAX_RADIUS_KM,
    maxEta: MAX_ETA_MINUTES,
    rankedList: ranked,
    fallbackUsed
  };
}

/**
 * Create Emergency Dispatch
 */
function createDispatch({ patientId, hospitalId, pickupLocation, autoAccept = true }) {
  const patient = dbStore.patients.find((p) => p.id === patientId) || dbStore.patients[0];
  const hospital = dbStore.hospitals.find((h) => h.id === hospitalId) || dbStore.hospitals[0];

  const actualPickup = pickupLocation || {
    lat: 17.4420,
    lng: 78.3780,
    address: "Hitec City Main Road, Cyberabad, Hyderabad"
  };

  // Run Smart Ambulance Selection within Max 20 KM / 30 MIN
  const selectionResult = findBestAmbulance(actualPickup, 'ALS');

  if (selectionResult.error) {
    return { success: false, message: selectionResult.error, code: selectionResult.code };
  }

  const { selectedAmbulance, distance, eta, fallbackUsed } = selectionResult;
  const reservationToken = `RES-${Math.floor(100000 + Math.random() * 900000)}`;
  const dispatchId = `DSP-${Math.floor(1000 + Math.random() * 9000)}`;

  // Update ambulance status
  selectedAmbulance.status = 'DISPATCHED';
  selectedAmbulance.lastUpdated = new Date().toISOString();

  // Create Dispatch Record
  const newDispatch = {
    id: dispatchId,
    patientId: patient.id,
    patientName: patient.name,
    emergencyType: patient.emergencyType,
    severity: patient.severity,
    vitals: patient.vitals,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    hospitalLocation: {
      lat: hospital.latitude,
      lng: hospital.longitude,
      address: hospital.address
    },
    ambulanceId: selectedAmbulance.id,
    ambulanceNumber: selectedAmbulance.vehicleNumber,
    ambulanceType: selectedAmbulance.type,
    driverName: selectedAmbulance.driverName,
    driverPhone: selectedAmbulance.driverPhone,
    equipment: selectedAmbulance.equipment || ["Advanced Cardiac Life Support", "Ventilator", "Defibrillator", "Multi-para Monitor", "IV Infusion Pump"],
    reservationToken,
    pickupLocation: actualPickup,
    currentLocation: {
      lat: selectedAmbulance.latitude,
      lng: selectedAmbulance.longitude
    },
    status: 'CONFIRMED',
    patientStatus: 'Reservation Confirmed',
    priority: patient.severity || 'CRITICAL',
    eta: Math.min(MAX_ETA_MINUTES, eta),
    distance: Math.min(MAX_RADIUS_KM, distance),
    maxRadius: MAX_RADIUS_KM,
    maxEta: MAX_ETA_MINUTES,
    fallbackUsed,
    timeline: [
      {
        status: 'CONFIRMED',
        title: 'Reservation Confirmed',
        timestamp: new Date().toISOString(),
        description: `Hospital ${hospital.name} confirmed reservation token #${reservationToken}`
      },
      {
        status: 'DISPATCHED',
        title: 'Ambulance Dispatched',
        timestamp: new Date().toISOString(),
        description: `Selected ${selectedAmbulance.type} Ambulance (${selectedAmbulance.vehicleNumber}) within ${MAX_RADIUS_KM} KM radius. Initial ETA: ${eta} min (Max ${MAX_ETA_MINUTES} min cap)`
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbStore.dispatches.unshift(newDispatch);
  patient.status = 'DISPATCHED';

  return {
    success: true,
    dispatch: newDispatch,
    ambulance: selectedAmbulance
  };
}

module.exports = {
  calculateDistance,
  calculateETA,
  findBestAmbulance,
  createDispatch,
  MAX_RADIUS_KM,
  MAX_ETA_MINUTES
};
