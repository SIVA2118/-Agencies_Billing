const mongoose = require('mongoose');

const BuyerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide buyer name'],
        unique: true,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    route: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Buyer', BuyerSchema);
