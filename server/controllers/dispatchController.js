const { dbStore, resetStore } = require('../models/store');
const { calculateDistance, calculateETA, findBestAmbulance, createDispatch } = require('../services/dispatchService');

// Map internal dispatch status to patient progression status label
const PATIENT_STATUS_MAP = {
  'CONFIRMED': 'Reservation Confirmed',
  'DISPATCHED': 'Ambulance Dispatched',
  'EN_ROUTE': 'Ambulance En Route',
  'ARRIVED_PICKUP': 'Arrived at Pickup',
  'PATIENT_PICKED_UP': 'Patient Picked Up',
  'TRANSIT_HOSPITAL': 'In Transit to Hospital',
  'ARRIVING_SOON': 'Arriving Soon',
  'ARRIVED_HOSPITAL': 'Arrived at Hospital',
  'COMPLETED': 'Emergency Completed',
  'REJECTED': 'Dispatch Re-routing Required'
};

const dispatchController = {
  // Create dispatch
  createDispatch: (req, res, io) => {
    try {
      const { patientId, hospitalId, pickupLocation, autoAccept } = req.body;
      const result = createDispatch({ patientId, hospitalId, pickupLocation, autoAccept });

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Socket.IO Notifications
      if (io) {
        io.emit('dispatch:created', result.dispatch);
        io.emit('ambulance:updated', result.ambulance);
        io.emit('alert:new', {
          type: 'EMERGENCY_DISPATCH',
          title: '🚨 EMERGENCY DISPATCH',
          message: `Hospital confirmed reservation. Nearest ${result.ambulance.type} ambulance (${result.ambulance.vehicleNumber}) dispatched! ETA: ${result.dispatch.eta} min`,
          dispatchId: result.dispatch.id
        });
      }

      return res.status(201).json(result);
    } catch (err) {
      console.error('Error creating dispatch:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get dispatch by ID
  getDispatchById: (req, res) => {
    const { id } = req.params;
    const dispatch = dbStore.dispatches.find((d) => d.id === id);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: 'Dispatch record not found' });
    }
    return res.json({ success: true, dispatch });
  },

  // List all dispatches
  getAllDispatches: (req, res) => {
    return res.json({ success: true, dispatches: dbStore.dispatches });
  },

  // Get available ambulances
  getAvailableAmbulances: (req, res) => {
    const available = dbStore.ambulances.filter((a) => a.status === 'AVAILABLE');
    return res.json({ success: true, count: available.length, ambulances: available });
  },

  // Get all ambulances
  getAllAmbulances: (req, res) => {
    return res.json({ success: true, ambulances: dbStore.ambulances });
  },

  // Manually or automatically assign specific ambulance to dispatch
  assignAmbulance: (req, res, io) => {
    const { id } = req.params;
    const { ambulanceId } = req.body;

    const dispatch = dbStore.dispatches.find((d) => d.id === id);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: 'Dispatch not found' });
    }

    const newAmbulance = dbStore.ambulances.find((a) => a.id === ambulanceId);
    if (!newAmbulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    // Free previous ambulance if assigned
    if (dispatch.ambulanceId) {
      const prevAmb = dbStore.ambulances.find((a) => a.id === dispatch.ambulanceId);
      if (prevAmb) prevAmb.status = 'AVAILABLE';
    }

    // Assign new ambulance
    newAmbulance.status = 'DISPATCHED';
    dispatch.ambulanceId = newAmbulance.id;
    dispatch.ambulanceNumber = newAmbulance.vehicleNumber;
    dispatch.ambulanceType = newAmbulance.type;
    dispatch.driverName = newAmbulance.driverName;
    dispatch.driverPhone = newAmbulance.driverPhone;
    dispatch.currentLocation = { lat: newAmbulance.latitude, lng: newAmbulance.longitude };

    // Recalculate ETA and distance based on current status
    const targetLoc = (dispatch.status === 'TRANSIT_HOSPITAL' || dispatch.status === 'ARRIVING_SOON')
      ? dispatch.hospitalLocation
      : dispatch.pickupLocation;

    dispatch.distance = calculateDistance(newAmbulance.latitude, newAmbulance.longitude, targetLoc.lat, targetLoc.lng);
    dispatch.eta = calculateETA(dispatch.distance);
    dispatch.updatedAt = new Date().toISOString();

    dispatch.timeline.push({
      status: 'REASSIGNED',
      title: 'Ambulance Reassigned',
      timestamp: new Date().toISOString(),
      description: `Reassigned to ${newAmbulance.type} Ambulance (${newAmbulance.vehicleNumber})`
    });

    if (io) {
      io.emit('dispatch:updated', dispatch);
      io.emit('ambulance:updated', newAmbulance);
    }

    return res.json({ success: true, dispatch, ambulance: newAmbulance });
  },

  // Update status (Driver or ER action)
  updateStatus: (req, res, io) => {
    const { id } = req.params;
    const { status } = req.body;

    const dispatch = dbStore.dispatches.find((d) => d.id === id);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: 'Dispatch not found' });
    }

    dispatch.status = status;
    dispatch.patientStatus = PATIENT_STATUS_MAP[status] || status;
    dispatch.updatedAt = new Date().toISOString();

    // Update associated ambulance state
    const ambulance = dbStore.ambulances.find((a) => a.id === dispatch.ambulanceId);
    if (ambulance) {
      if (status === 'COMPLETED') {
        ambulance.status = 'AVAILABLE';
      } else if (status === 'REJECTED') {
        ambulance.status = 'OFFLINE';
      } else {
        ambulance.status = status;
      }
      ambulance.lastUpdated = new Date().toISOString();
    }

    // Handle failure case (e.g. driver rejected dispatch)
    let reassignNotice = null;
    if (status === 'REJECTED') {
      const searchResult = findBestAmbulance(dispatch.pickupLocation, 'ALS');
      if (!searchResult.error) {
        const nextAmb = searchResult.selectedAmbulance;
        nextAmb.status = 'DISPATCHED';
        dispatch.ambulanceId = nextAmb.id;
        dispatch.ambulanceNumber = nextAmb.vehicleNumber;
        dispatch.ambulanceType = nextAmb.type;
        dispatch.driverName = nextAmb.driverName;
        dispatch.driverPhone = nextAmb.driverPhone;
        dispatch.status = 'DISPATCHED';
        dispatch.patientStatus = 'Ambulance Dispatched';
        reassignNotice = `Ambulance driver rejected. Automatically re-routed to next available ALS unit (${nextAmb.vehicleNumber})!`;
      }
    }

    const titleMap = {
      'EN_ROUTE': 'Ambulance En Route to Pickup',
      'ARRIVED_PICKUP': 'Ambulance Arrived at Pickup Location',
      'PATIENT_PICKED_UP': 'Patient Secured & Picked Up',
      'TRANSIT_HOSPITAL': 'In Transit to Hospital ER',
      'ARRIVING_SOON': 'Arriving at Hospital ER Soon',
      'ARRIVED_HOSPITAL': 'Arrived at Hospital Emergency Room',
      'COMPLETED': 'Emergency Mission Completed',
      'REJECTED': 'Driver Rejected - Auto Rerouted'
    };

    dispatch.timeline.push({
      status: dispatch.status,
      title: titleMap[status] || status,
      timestamp: new Date().toISOString(),
      description: reassignNotice || `Status updated to ${dispatch.patientStatus}`
    });

    if (io) {
      io.emit('dispatch:updated', dispatch);
      if (ambulance) io.emit('ambulance:updated', ambulance);
      
      if (status === 'ARRIVED_HOSPITAL') {
        io.emit('alert:new', {
          type: 'ARRIVED',
          title: '✅ AMBULANCE ARRIVED',
          message: 'Patient has reached the hospital emergency room. Medical trauma team ready for immediate treatment!',
          dispatchId: dispatch.id
        });
      } else {
        io.emit('alert:new', {
          type: 'STATUS_UPDATE',
          title: `Status: ${dispatch.patientStatus}`,
          message: `Dispatch #${dispatch.id} status changed to ${dispatch.patientStatus}`,
          dispatchId: dispatch.id
        });
      }
    }

    return res.json({ success: true, dispatch, ambulance });
  },

  // Update ambulance GPS location & recalculate dynamic ETA
  updateLocation: (req, res, io) => {
    const { id } = req.params; // Ambulance ID or Dispatch ID
    const { lat, lng } = req.body;

    let dispatch = dbStore.dispatches.find((d) => d.id === id || d.ambulanceId === id);
    let ambulance = dbStore.ambulances.find((a) => a.id === id || (dispatch && a.id === dispatch.ambulanceId));

    if (ambulance) {
      ambulance.latitude = lat;
      ambulance.longitude = lng;
      ambulance.lastUpdated = new Date().toISOString();
    }

    if (dispatch) {
      dispatch.currentLocation = { lat, lng };

      // Destination target depending on trip phase
      const destination = (dispatch.status === 'TRANSIT_HOSPITAL' || dispatch.status === 'ARRIVING_SOON')
        ? dispatch.hospitalLocation
        : dispatch.pickupLocation;

      const dist = calculateDistance(lat, lng, destination.lat, destination.lng);
      const eta = calculateETA(dist);

      dispatch.distance = dist;
      dispatch.eta = eta;
      dispatch.updatedAt = new Date().toISOString();

      // Trigger 'ARRIVING_SOON' alert when distance <= 1.0 km during transit
      if (dispatch.status === 'TRANSIT_HOSPITAL' && dist <= 1.0) {
        dispatch.status = 'ARRIVING_SOON';
        dispatch.patientStatus = 'Arriving Soon';
        dispatch.timeline.push({
          status: 'ARRIVING_SOON',
          title: 'Arriving Soon',
          timestamp: new Date().toISOString(),
          description: `Ambulance is within 1.0 km of Hospital ER (${eta} min away)`
        });
      }

      if (io) {
        io.emit('dispatch:location', {
          dispatchId: dispatch.id,
          ambulanceId: ambulance ? ambulance.id : null,
          location: { lat, lng },
          distance: dist,
          eta,
          status: dispatch.status,
          patientStatus: dispatch.patientStatus
        });
        io.emit('dispatch:updated', dispatch);
      }
    }

    return res.json({
      success: true,
      ambulance,
      dispatch: dispatch ? { id: dispatch.id, distance: dispatch.distance, eta: dispatch.eta } : null
    });
  },

  // Get dynamic ETA
  getETA: (req, res) => {
    const { id } = req.params;
    const dispatch = dbStore.dispatches.find((d) => d.id === id);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: 'Dispatch not found' });
    }
    return res.json({
      success: true,
      dispatchId: dispatch.id,
      eta: dispatch.eta,
      distance: dispatch.distance,
      currentLocation: dispatch.currentLocation,
      status: dispatch.status
    });
  },

  // Reset demo store
  resetStoreData: (req, res, io) => {
    resetStore();
    if (io) {
      io.emit('store:reset', { timestamp: new Date().toISOString() });
    }
    return res.json({ success: true, message: 'System data reset to initial state' });
  }
};

module.exports = dispatchController;
