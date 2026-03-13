const express = require('express');
const router = express.Router();
const { login, register, createEmployee, getEmployees, deleteEmployee } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.get('/employees', protect, getEmployees);
router.post('/employees', protect, authorize('admin'), createEmployee);
router.delete('/employees/:id', protect, authorize('admin'), deleteEmployee);

module.exports = router;
