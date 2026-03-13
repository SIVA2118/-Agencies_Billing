const Buyer = require('../models/Buyer');

exports.getBuyers = async (req, res) => {
    try {
        const buyers = await Buyer.find().sort({ name: 1 });
        res.status(200).json({ success: true, count: buyers.length, data: buyers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createBuyer = async (req, res) => {
    try {
        const payload = {
            name: String(req.body.name || '').trim(),
            address: String(req.body.address || '').trim(),
            route: String(req.body.route || '').trim(),
            phone: String(req.body.phone || '').trim(),
        };

        if (!payload.name) {
            return res.status(400).json({ success: false, message: 'Buyer name is required' });
        }

        const buyer = await Buyer.create(payload);
        res.status(201).json({ success: true, data: buyer });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteBuyer = async (req, res) => {
    try {
        const buyer = await Buyer.findById(req.params.id);
        if (!buyer) {
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }

        await buyer.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
