const { dbStore, resetStore } = require('../models/store');
const { createDispatch, calculateDistance, calculateETA } = require('./dispatchService');

class SimulationManager {
  constructor() {
    this.activeTimer = null;
    this.restartTimer = null;
    this.isRunning = false;
    this.currentStep = 0;
    this.speedMultiplier = 1;
  }

  // Generate geographic interpolation path with realistic city curves
  generateRoutePoints(start, end, steps = 40) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      // Add slight jitter for realistic city street curves
      const jitterLat = Math.sin(fraction * Math.PI * 4) * 0.0012;
      const jitterLng = Math.cos(fraction * Math.PI * 4) * 0.0012;
      points.push({
        lat: start.lat + (end.lat - start.lat) * fraction + (i > 0 && i < steps ? jitterLat : 0),
        lng: start.lng + (end.lng - start.lng) * fraction + (i > 0 && i < steps ? jitterLng : 0)
      });
    }
    return points;
  }

  stopSimulation() {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.isRunning = false;
  }

  startSimulation(io, options = {}) {
    this.stopSimulation();
    resetStore();

    this.isRunning = true;
    this.speedMultiplier = options.speed || 1;

    // Phase 1: Create initial hospital confirmation & dispatch
    const patient = dbStore.patients[0];
    const hospital = dbStore.hospitals[0];

    // Pickup location ~9.2 km from depot
    const pickupLoc = patient.pickupLocation || {
      lat: 17.4450,
      lng: 78.3850,
      address: "Mindspace IT Park, Hitec City, Hyderabad"
    };

    // Ambulance initial depot location (~9.2 km away in Miyapur)
    const depotLoc = { lat: 17.5120, lng: 78.3420 };

    // Hospital destination location (~11.5 km away in Koti ER)
    const hospitalLoc = {
      lat: 17.3850,
      lng: 78.4860,
      name: "Apollo Emergency & Trauma Center",
      address: "Road No. 36, Jubilee Hills, Hyderabad"
    };

    const dispatchResult = createDispatch({
      patientId: patient.id,
      hospitalId: hospital.id,
      pickupLocation: pickupLoc
    });

    if (!dispatchResult.success) {
      this.isRunning = false;
      return { success: false, message: dispatchResult.message };
    }

    const dispatch = dispatchResult.dispatch;
    const ambulance = dispatchResult.ambulance;

    // Set realistic city coordinates for 18.5 KM total route
    ambulance.latitude = depotLoc.lat;
    ambulance.longitude = depotLoc.lng;
    dispatch.hospitalLocation = hospitalLoc;

    // Calculate initial initial distance & ETA
    const initialDist = calculateDistance(depotLoc.lat, depotLoc.lng, pickupLoc.lat, pickupLoc.lng) +
                        calculateDistance(pickupLoc.lat, pickupLoc.lng, hospitalLoc.lat, hospitalLoc.lng);
    dispatch.distance = initialDist; // ~18.5 km
    dispatch.eta = calculateETA(initialDist);

    if (io) {
      io.emit('simulation:started', { dispatch, ambulance });
      io.emit('dispatch:created', dispatch);
    }

    // Generate interpolation waypoints for 2 legs (Leg 1: 30 steps, Leg 2: 45 steps)
    const leg1 = this.generateRoutePoints(depotLoc, pickupLoc, 35);
    const leg2 = this.generateRoutePoints(pickupLoc, hospitalLoc, 45);

    let leg1Index = 0;
    let leg2Index = 0;
    let stage = 'LEG1_EN_ROUTE'; // LEG1_EN_ROUTE -> ARRIVED_PICKUP -> PATIENT_PICKED_UP -> LEG2_TRANSIT -> COMPLETED

    const intervalMs = Math.max(300, Math.floor(1500 / this.speedMultiplier));

    this.activeTimer = setInterval(() => {
      if (!this.isRunning) return;

      if (stage === 'LEG1_EN_ROUTE') {
        if (leg1Index < leg1.length) {
          const pt = leg1[leg1Index];
          ambulance.latitude = pt.lat;
          ambulance.longitude = pt.lng;

          // Leg 1 distance remaining to pickup + Leg 2 distance to hospital
          const distToPickup = calculateDistance(pt.lat, pt.lng, pickupLoc.lat, pickupLoc.lng);
          const distPickupToHosp = calculateDistance(pickupLoc.lat, pickupLoc.lng, hospitalLoc.lat, hospitalLoc.lng);
          const totalRemainingDist = Math.round((distToPickup + distPickupToHosp) * 10) / 10;

          const eta = calculateETA(totalRemainingDist);
          dispatch.currentLocation = pt;
          dispatch.distance = Math.max(0.5, totalRemainingDist);
          dispatch.eta = Math.max(1, eta);
          dispatch.status = leg1Index === 0 ? 'DISPATCHED' : 'EN_ROUTE';
          dispatch.patientStatus = leg1Index === 0 ? 'Ambulance Dispatched' : 'Ambulance En Route';

          if (io) {
            io.emit('dispatch:location', {
              dispatchId: dispatch.id,
              location: pt,
              distance: dispatch.distance,
              eta: dispatch.eta,
              status: dispatch.status,
              patientStatus: dispatch.patientStatus
            });
            io.emit('dispatch:updated', dispatch);
          }
          leg1Index++;
        } else {
          // Reached Pickup Location!
          stage = 'ARRIVED_PICKUP';
          dispatch.status = 'ARRIVED_PICKUP';
          dispatch.patientStatus = 'Arrived at Pickup';
          dispatch.timeline.push({
            status: 'ARRIVED_PICKUP',
            title: 'Arrived at Pickup',
            timestamp: new Date().toISOString(),
            description: `Ambulance reached patient pickup location (${pickupLoc.address})`
          });
          if (io) {
            io.emit('dispatch:updated', dispatch);
            io.emit('alert:new', {
              type: 'ARRIVED_PICKUP',
              title: '📍 AMBULANCE AT PICKUP',
              message: 'Ambulance has arrived at patient location. Paramedics securing patient.',
              dispatchId: dispatch.id
            });
          }
        }
      } else if (stage === 'ARRIVED_PICKUP') {
        stage = 'PATIENT_PICKED_UP';
        dispatch.status = 'PATIENT_PICKED_UP';
        dispatch.patientStatus = 'Patient Picked Up';
        dispatch.timeline.push({
          status: 'PATIENT_PICKED_UP',
          title: 'Patient Picked Up',
          timestamp: new Date().toISOString(),
          description: 'Patient secured in ambulance with ALS life support monitoring active'
        });
        if (io) io.emit('dispatch:updated', dispatch);
      } else if (stage === 'PATIENT_PICKED_UP') {
        stage = 'LEG2_TRANSIT';
        dispatch.status = 'TRANSIT_HOSPITAL';
        dispatch.patientStatus = 'In Transit to Hospital';
        dispatch.timeline.push({
          status: 'TRANSIT_HOSPITAL',
          title: 'In Transit to Hospital',
          timestamp: new Date().toISOString(),
          description: `Emergency transit initiated toward ${hospital.name}`
        });
        if (io) io.emit('dispatch:updated', dispatch);
      } else if (stage === 'LEG2_TRANSIT') {
        if (leg2Index < leg2.length) {
          const pt = leg2[leg2Index];
          ambulance.latitude = pt.lat;
          ambulance.longitude = pt.lng;

          const dist = calculateDistance(pt.lat, pt.lng, hospitalLoc.lat, hospitalLoc.lng);
          const eta = calculateETA(dist);
          dispatch.currentLocation = pt;
          dispatch.distance = Math.max(0.1, dist);
          dispatch.eta = Math.max(1, eta);

          if (dist <= 1.0 && dispatch.status !== 'ARRIVING_SOON') {
            dispatch.status = 'ARRIVING_SOON';
            dispatch.patientStatus = 'Arriving Soon';
            dispatch.timeline.push({
              status: 'ARRIVING_SOON',
              title: 'Arriving Soon',
              timestamp: new Date().toISOString(),
              description: `Ambulance is ${dist} km from ER hospital entrance`
            });
            if (io) {
              io.emit('alert:new', {
                type: 'ARRIVING_SOON',
                title: '⚡ ARRIVING SOON',
                message: `Ambulance within ${dist} km of Emergency Room!`,
                dispatchId: dispatch.id
              });
            }
          }

          if (io) {
            io.emit('dispatch:location', {
              dispatchId: dispatch.id,
              location: pt,
              distance: dispatch.distance,
              eta: dispatch.eta,
              status: dispatch.status,
              patientStatus: dispatch.patientStatus
            });
            io.emit('dispatch:updated', dispatch);
          }
          leg2Index++;
        } else {
          // Reached Hospital!
          stage = 'COMPLETED';
          dispatch.status = 'ARRIVED_HOSPITAL';
          dispatch.patientStatus = 'Arrived at Hospital';
          dispatch.distance = 0.0;
          dispatch.eta = 0;
          ambulance.status = 'AVAILABLE';

          dispatch.timeline.push({
            status: 'ARRIVED_HOSPITAL',
            title: 'Arrived at Hospital',
            timestamp: new Date().toISOString(),
            description: `Patient safely delivered to ${hospital.name} Trauma Bay`
          });

          if (io) {
            io.emit('dispatch:updated', dispatch);
            io.emit('ambulance:updated', ambulance);
            io.emit('alert:new', {
              type: 'ARRIVED',
              title: '✅ AMBULANCE ARRIVED AT HOSPITAL',
              message: 'Patient delivered to Trauma Room #4. Restarting live route tracking in 4s...',
              dispatchId: dispatch.id
            });
          }

          this.stopSimulation();

          // Auto-restart simulation loop after 4 seconds so distance is always active and moving!
          this.restartTimer = setTimeout(() => {
            this.startSimulation(io, options);
          }, 4000);
        }
      }
    }, intervalMs);

    return { success: true, dispatchId: dispatch.id };
  }
}

const simulationInstance = new SimulationManager();
module.exports = simulationInstance;
