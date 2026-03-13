const express = require('express');
const router = express.Router();
const {
    getBuyers,
    createBuyer,
    deleteBuyer,
} = require('../controllers/buyerController');

router.get('/', getBuyers);
router.post('/', createBuyer);
router.delete('/:id', deleteBuyer);

module.exports = router;
