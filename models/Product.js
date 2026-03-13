const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    particulars: {
        type: String,
        required: [true, 'Please provide product particulars'],
        trim: true,
    },
    category: {
        type: String,
        trim: true,
    },
    hsn: {
        type: String,
        trim: true,
    },
    qty: {
        type: String,
        required: [true, 'Please provide quantity'],
        trim: true,
    },
    rate: {
        type: Number,
        required: [true, 'Please provide rate'],
        default: 0,
    },
    grossAmt: {
        type: Number,
        required: [true, 'Please provide gross amount'],
        default: 0,
    },
    cgstPct: {
        type: Number,
        required: [true, 'Please provide CGST percentage'],
        default: 0,
    },
    cgstAmt: {
        type: Number,
        required: [true, 'Please provide CGST amount'],
        default: 0,
    },
    sgstPct: {
        type: Number,
        required: [true, 'Please provide SGST percentage'],
        default: 0,
    },
    sgstAmt: {
        type: Number,
        required: [true, 'Please provide SGST amount'],
        default: 0,
    },
    name: {
        type: String,
        trim: true,
    },
    sku: {
        type: String,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    unitPrice: {
        type: Number,
        default: 0,
    },
    taxRate: {
        type: Number,
        default: 18,
    },
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
