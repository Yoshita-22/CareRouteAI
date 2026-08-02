const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const hospitalController = require('../controllers/hospitalController');
const doctorController = require('../controllers/doctorController');

module.exports = function (io) {
  // AI Doctor Avatar Video Call & Vision Routes
  router.post('/doctor/multimodal-triage', doctorController.processMultimodalTriageEndpoint);
  router.post('/doctor/consult', doctorController.consultDoctorEndpoint);
  router.post('/doctor/beyond-presence/session', doctorController.initiateBeyondPresenceEndpoint);
  router.get('/doctor/conversations', doctorController.getConversationsEndpoint);

  // Layer 2 Hospital Match Scoring & Ranking Routes
  router.post('/hospitals/rank', hospitalController.rankHospitalsEndpoint);
  router.get('/hospitals', hospitalController.getRawHospitals);
  router.post('/hospitals/reserve', hospitalController.reserveBedEndpoint);
  router.post('/hospital/confirm-reservation', hospitalController.confirmReservationEndpoint);


  // Dispatch Routes
  router.post('/dispatch/create', (req, res) => dispatchController.createDispatch(req, res, io));
  router.get('/dispatch', dispatchController.getAllDispatches);
  router.get('/dispatch/:id', dispatchController.getDispatchById);
  router.post('/dispatch/:id/assign', (req, res) => dispatchController.assignAmbulance(req, res, io));
  router.patch('/dispatch/:id/status', (req, res) => dispatchController.updateStatus(req, res, io));
  router.get('/dispatch/:id/eta', dispatchController.getETA);

  // Ambulance Routes
  router.get('/ambulances', dispatchController.getAllAmbulances);
  router.get('/ambulances/available', dispatchController.getAvailableAmbulances);
  router.patch('/ambulances/:id/location', (req, res) => dispatchController.updateLocation(req, res, io));

  // Store management
  router.post('/store/reset', (req, res) => dispatchController.resetStoreData(req, res, io));

  return router;
};
