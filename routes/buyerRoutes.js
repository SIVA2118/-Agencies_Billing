const express = require('express');
const router = express.Router();
const {
    getBuyers,
    getBuyerById,
    createBuyer,
    updateBuyer,
    deleteBuyer,
} = require('../controllers/buyerController');

router.get('/', getBuyers);
router.post('/', createBuyer);
router.get('/:id', getBuyerById);
router.put('/:id', updateBuyer);
router.delete('/:id', deleteBuyer);

module.exports = router;
