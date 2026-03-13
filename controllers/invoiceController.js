const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

function parseQty(value) {
    const numericValue = parseFloat(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatQty(value) {
    return Number(value.toFixed(3)).toString();
}

function aggregateItemQty(items) {
    const qtyByParticulars = new Map();

    (items || []).forEach((item) => {
        const key = String(item.particulars || '').trim().toLowerCase();
        if (!key) {
            return;
        }

        const current = qtyByParticulars.get(key) || 0;
        qtyByParticulars.set(key, current + parseQty(item.qty));
    });

    return qtyByParticulars;
}

async function adjustInventory(items, direction) {
    const qtyByParticulars = aggregateItemQty(items);

    for (const [particularsKey, billedQty] of qtyByParticulars.entries()) {
        if (billedQty <= 0) {
            continue;
        }

        const product = await Product.findOne({
            particulars: { $regex: `^${particularsKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });

        if (!product) {
            continue;
        }

        const currentQty = parseQty(product.qty);
        const adjustedQty = direction === 'decrease'
            ? Math.max(0, currentQty - billedQty)
            : currentQty + billedQty;

        const rate = Number(product.rate || product.unitPrice || 0);
        const cgstPct = Number(product.cgstPct || 0);
        const sgstPct = Number(product.sgstPct || 0);
        const grossAmt = Number((adjustedQty * rate).toFixed(2));
        const cgstAmt = Number(((grossAmt * cgstPct) / 100).toFixed(2));
        const sgstAmt = Number(((grossAmt * sgstPct) / 100).toFixed(2));

        product.qty = formatQty(adjustedQty);
        product.grossAmt = grossAmt;
        product.cgstAmt = cgstAmt;
        product.sgstAmt = sgstAmt;
        await product.save();
    }
}

function normalizeItems(items) {
    return (items || []).map((item, index) => ({
        slNo: item.slNo ?? index + 1,
        particulars: item.particulars,
        qty: item.qty,
        rate: Number(item.rate || 0),
        grossAmt: Number(item.grossAmt || 0),
        cgstPct: Number(item.cgstPct || 0),
        cgstAmt: Number(item.cgstAmt || 0),
        sgstPct: Number(item.sgstPct || 0),
        sgstAmt: Number(item.sgstAmt || 0),
        total: Number(item.total || 0),
    }));
}

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Helper: auto-calculate totals from items ─────────────────────────────────
function calculateTotals(items) {
    const totalUnits = items.reduce((s, i) => s + i.grossAmt, 0);
    const totalTax = items.reduce((s, i) => s + i.cgstAmt + i.sgstAmt, 0);
    const netAmount = totalUnits + totalTax;
    const roundedOff = parseFloat((Math.round(netAmount) - netAmount).toFixed(2));
    const totalAmount = Math.round(netAmount);

    // Build tax-summary buckets
    const buckets = {};
    items.forEach((item) => {
        const key = `${item.cgstPct}-${item.sgstPct}`;
        if (!buckets[key]) {
            buckets[key] = {
                cgstPct: item.cgstPct, sgstPct: item.sgstPct,
                cgstValue: 0, sgstValue: 0, taxable: 0
            };
        }
        buckets[key].cgstValue += item.cgstAmt;
        buckets[key].sgstValue += item.sgstAmt;
        buckets[key].taxable += item.grossAmt;
    });

    const taxSummary = Object.values(buckets).map((b) => ({
        cgstPct: b.cgstPct,
        cgstValue: parseFloat(b.cgstValue.toFixed(2)),
        sgstPct: b.sgstPct,
        sgstValue: parseFloat(b.sgstValue.toFixed(2)),
        taxable: parseFloat(b.taxable.toFixed(2)),
    }));

    const cgstTotal = parseFloat(taxSummary.reduce((s, b) => s + b.cgstValue, 0).toFixed(2));
    const sgstTotal = parseFloat(taxSummary.reduce((s, b) => s + b.sgstValue, 0).toFixed(2));

    return {
        totalUnits: parseFloat(totalUnits.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        taxSummary,
        cgstTotal,
        sgstTotal,
        netAmount: parseFloat(netAmount.toFixed(2)),
        roundedOff,
        totalAmount,
    };
}

// ── GET all invoices ─────────────────────────────────────────────────────────
exports.getAllInvoices = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
        const shouldPaginate = req.query.paginate === '1' || 'page' in req.query || 'limit' in req.query;
        const buyer = String(req.query.buyer || '').trim();
        const employee = String(req.query.employee || '').trim();
        const search = String(req.query.search || '').trim();

        const filter = {};

        if (req.user?.role === 'employee' && req.user?.employeeId) {
            filter.$or = [
                { employeeId: req.user.employeeId },
                { Adminid: req.user.employeeId },
            ];
        }

        if (buyer) {
            filter['buyer.name'] = { $regex: `^${escapeRegex(buyer)}$`, $options: 'i' };
        }

        if (employee) {
            const employeeFilter = [
                { employeeId: { $regex: `^${escapeRegex(employee)}$`, $options: 'i' } },
                { Adminid: { $regex: `^${escapeRegex(employee)}$`, $options: 'i' } },
            ];

            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, { $or: employeeFilter }];
                delete filter.$or;
            } else {
                filter.$or = employeeFilter;
            }
        }

        if (search) {
            const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
            const searchFilter = {
                $or: [
                    { invoiceNo: searchRegex },
                    { 'buyer.name': searchRegex },
                    { employeeId: searchRegex },
                    { Adminid: searchRegex },
                ],
            };

            if (filter.$and) {
                filter.$and.push(searchFilter);
            } else if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, searchFilter];
                delete filter.$or;
            } else {
                Object.assign(filter, searchFilter);
            }
        }

        const sort = { createdAt: -1 };

        if (shouldPaginate) {
            const skip = (page - 1) * limit;
            const [invoices, total] = await Promise.all([
                Invoice.find(filter).sort(sort).skip(skip).limit(limit),
                Invoice.countDocuments(filter),
            ]);

            const totalPages = Math.max(Math.ceil(total / limit), 1);
            return res.json({
                success: true,
                count: invoices.length,
                data: invoices,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            });
        }

        const invoices = await Invoice.find(filter).sort(sort);
        res.json({ success: true, count: invoices.length, data: invoices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET single invoice ───────────────────────────────────────────────────────
exports.getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        res.json({ success: true, data: invoice });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── CREATE invoice ───────────────────────────────────────────────────────────
exports.createInvoice = async (req, res) => {
    try {
        const normalizedItems = normalizeItems(req.body.items);
        const calculated = calculateTotals(normalizedItems);
        const isAdmin = req.user?.role === 'admin';
        const employeeMeta = {
            Adminid: isAdmin ? (req.user?.Adminid || req.user?.employeeId || '') : undefined,
            employeeId: isAdmin ? (req.body?.employeeId || '') : (req.user?.employeeId || ''),
            employeeName: isAdmin
                ? (req.body?.employeeName || req.user?.username || '')
                : (req.user?.username || ''),
        };
        const invoice = await Invoice.create({ ...req.body, ...employeeMeta, items: normalizedItems, ...calculated });
        await adjustInventory(normalizedItems, 'decrease');
        res.status(201).json({ success: true, data: invoice });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── UPDATE invoice ───────────────────────────────────────────────────────────
exports.updateInvoice = async (req, res) => {
    try {
        const existingInvoice = await Invoice.findById(req.params.id);
        if (!existingInvoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const normalizedItems = normalizeItems(req.body.items);
        const calculated = calculateTotals(normalizedItems);

        await adjustInventory(existingInvoice.items, 'increase');
        await adjustInventory(normalizedItems, 'decrease');

        const isAdmin = req.user?.role === 'admin';
        const employeeMeta = {
            Adminid: isAdmin
                ? (req.user?.Adminid || req.user?.employeeId || existingInvoice.Adminid || '')
                : (existingInvoice.Adminid || undefined),
            employeeId: isAdmin
                ? (req.body?.employeeId || existingInvoice.employeeId || '')
                : (req.user?.employeeId || existingInvoice.employeeId || ''),
            employeeName: isAdmin
                ? (req.body?.employeeName || req.user?.username || existingInvoice.employeeName || '')
                : (req.user?.username || existingInvoice.employeeName || ''),
        };

        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { ...req.body, ...employeeMeta, items: normalizedItems, ...calculated },
            { new: true, runValidators: true }
        );
        res.json({ success: true, data: invoice });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── DELETE invoice ───────────────────────────────────────────────────────────
exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        await adjustInventory(invoice.items, 'increase');
        await invoice.deleteOne();
        res.json({ success: true, message: 'Invoice deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
