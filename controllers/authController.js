const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ── GET Token ───────────────────────────────────────────────────────────────
const getToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const getDateStamp = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

const nextRoleId = async (prefix, idField = 'employeeId') => {
    const stamp = getDateStamp();
    const pattern = new RegExp(`^${prefix}-${stamp}-(\\d{3})$`);

    let users = [];
    if (idField === 'Adminid') {
        users = await User.find({
            role: 'admin',
            $or: [
                { Adminid: { $regex: `^${prefix}-${stamp}-` } },
                { employeeId: { $regex: `^${prefix}-${stamp}-` } },
            ],
        }).select('Adminid employeeId');
    } else {
        users = await User.find({ employeeId: { $regex: `^${prefix}-${stamp}-` } }).select('employeeId');
    }

    const maxSeq = users.reduce((max, u) => {
        const rawId = idField === 'Adminid' ? (u.Adminid || u.employeeId || '') : (u.employeeId || '');
        const match = String(rawId).match(pattern);
        const seq = match ? Number(match[1]) : 0;
        return Math.max(max, seq);
    }, 0);
    return `${prefix}-${stamp}-${String(maxSeq + 1).padStart(3, '0')}`;
};

const buildUserPayload = (user) => {
    if (user.role === 'admin') {
        return {
            id: user._id,
            username: user.username,
            role: user.role,
            Adminid: user.Adminid || null,
        };
    }

    return {
        id: user._id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId || null,
    };
};

// ── Login User ───────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    try {
        const user = await User.findOne({ username }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.role === 'admin') {
            if (!user.Adminid) {
                user.Adminid = user.employeeId || await nextRoleId('AD', 'Adminid');
                user.employeeId = undefined;
                await user.save();
            }
        } else if (!user.employeeId) {
            user.employeeId = await nextRoleId('SS');
            await user.save();
        }

        res.status(200).json({
            success: true,
            token: getToken(user._id),
            user: buildUserPayload(user)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Register (Optional/Initial) ─────────────────────────────────────────────
exports.register = async (req, res) => {
    const { username, password } = req.body;
    try {
        const employeeId = await nextRoleId('SS');
        const user = await User.create({ username, password, role: 'employee', employeeId });
        res.status(201).json({
            success: true,
            token: getToken(user._id),
            user: buildUserPayload(user)
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── Admin: Create Employee ──────────────────────────────────────────────────
exports.createEmployee = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    try {
        const exists = await User.findOne({ username });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const employeeId = await nextRoleId('SS');
        const user = await User.create({ username, password, role: 'employee', employeeId });

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: { id: user._id, username: user.username, role: user.role, employeeId: user.employeeId }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── Get Employees (for dropdown/search) ─────────────────────────────────────
exports.getEmployees = async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' })
            .select('username employeeId role createdAt')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: employees.length, data: employees });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Delete Employee ──────────────────────────────────────────────────────────
exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        if (employee.role !== 'employee') {
            return res.status(403).json({ success: false, message: 'Cannot delete admin accounts' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Employee deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
