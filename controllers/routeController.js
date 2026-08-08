const Route = require('../models/Route');

exports.createRoute = async (req, res) => {
    try {
        const route = await Route.create({ name: req.body.name });
        res.status(201).json({ success: true, data: route });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.getRoutes = async (req, res) => {
    try {
        const routes = await Route.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: routes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteRoute = async (req, res) => {
    try {
        const route = await Route.findByIdAndDelete(req.params.id);
        if (!route) {
            return res.status(404).json({ success: false, message: 'Route not found' });
        }
        res.status(200).json({ success: true, message: 'Route deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
