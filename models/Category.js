const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide category name'],
        unique: true,
        trim: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
