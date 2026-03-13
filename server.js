const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const invoiceRoutes = require('./routes/invoiceRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const buyerRoutes = require('./routes/buyerRoutes');
const { protect } = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', protect, invoiceRoutes);
app.use('/api/products', protect, productRoutes);
app.use('/api/categories', protect, categoryRoutes);
app.use('/api/buyers', protect, buyerRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: 'Invoice API Running' }));

// Initial Admin User Creation
const User = require('./models/User');
const getDateStamp = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

const nextAdminId = async () => {
    const stamp = getDateStamp();
    const pattern = /^AD-\d{8}-(\d{3})$/;
    const users = await User.find({
        role: 'admin',
        $or: [
            { Adminid: { $regex: '^AD-' } },
            { employeeId: { $regex: '^AD-' } },
        ],
    }).select('Adminid employeeId');
    const maxSeq = users.reduce((max, u) => {
        const match = String(u.Adminid || u.employeeId || '').match(pattern);
        const seq = match ? Number(match[1]) : 0;
        return Math.max(max, seq);
    }, 0);
    return `AD-${stamp}-${String(maxSeq + 1).padStart(3, '0')}`;
};

const createAdmin = async () => {
    try {
        const admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            const Adminid = await nextAdminId();
            await User.create({ username: 'admin', password: 'password123', role: 'admin', Adminid });
            console.log('👤 Default Admin Created: admin / password123');
        } else if (admin.role !== 'admin') {
            admin.role = 'admin';
            if (!admin.Adminid) {
                admin.Adminid = admin.employeeId || await nextAdminId();
            }
            admin.employeeId = undefined;
            await admin.save();
        } else if (!admin.Adminid) {
            admin.Adminid = admin.employeeId || await nextAdminId();
            admin.employeeId = undefined;
            await admin.save();
        }
    } catch (err) {
        console.error('❌ Admin Creation Error:', err.message);
    }
};

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        createAdmin();
        app.listen(process.env.PORT, () =>
            console.log(`🚀 Server running on port ${process.env.PORT}`)
        );
    })
    .catch((err) => console.error('❌ MongoDB Error:', err));
