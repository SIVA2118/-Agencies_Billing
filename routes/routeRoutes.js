const express = require('express');
const router = express.Router();
const { createRoute, getRoutes, deleteRoute } = require('../controllers/routeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createRoute);
router.get('/', getRoutes);
router.delete('/:id', deleteRoute);

module.exports = router;
