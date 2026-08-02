const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

router.get('/logs', callController.getCallLogs);
router.post('/log', callController.saveCallLog);
router.delete('/logs', callController.clearCallLogs);

module.exports = router;
