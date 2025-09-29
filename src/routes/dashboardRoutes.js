const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

router.get('/my-uploads', authMiddleware, dashboardController.getMyUploads);

module.exports = router;
