const express = require('express');
const router = express.Router();
const {
    getAllInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
} = require('../controllers/invoiceController');

router.route('/')
    .get(getAllInvoices)
    .post(createInvoice);

router.route('/:id')
    .get(getInvoice)
    .put(updateInvoice)
    .delete(deleteInvoice);

module.exports = router;
