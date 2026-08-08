const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a route name'],
        unique: true,
        trim: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Route', RouteSchema);
