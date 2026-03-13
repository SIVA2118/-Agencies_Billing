const Product = require('../models/Product');

const toNumber = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const buildLegacySku = (source) => {
    const cleaned = String(source || 'PRODUCT')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${cleaned || 'PRODUCT'}-${Date.now()}`;
};

const buildProductPayload = (body, existingProduct) => {
    const particulars = String(body.particulars || body.name || '').trim();
    const qty = String(body.qty || '').trim();
    const rate = toNumber(body.rate ?? body.unitPrice);
    const grossAmt = toNumber(body.grossAmt ?? rate * toNumber(body.qty));
    const totalTaxRate = body.taxRate !== undefined ? toNumber(body.taxRate) : null;
    const cgstPct = body.cgstPct !== undefined ? toNumber(body.cgstPct) : (totalTaxRate !== null ? totalTaxRate / 2 : 0);
    const sgstPct = body.sgstPct !== undefined ? toNumber(body.sgstPct) : (totalTaxRate !== null ? totalTaxRate / 2 : 0);
    const cgstAmt = toNumber(body.cgstAmt ?? ((grossAmt * cgstPct) / 100).toFixed(2));
    const sgstAmt = toNumber(body.sgstAmt ?? ((grossAmt * sgstPct) / 100).toFixed(2));
    const entryDate = body.entryDate ? new Date(body.entryDate) : (existingProduct?.entryDate || null);
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : (existingProduct?.expiryDate || null);

    return {
        particulars,
        category: String(body.category || existingProduct?.category || '').trim(),
        hsn: String(body.hsn || existingProduct?.hsn || '').trim(),
        qty,
        rate,
        grossAmt,
        cgstPct,
        cgstAmt,
        sgstPct,
        sgstAmt,
        entryDate,
        expiryDate,
        description: String(body.description || '').trim(),
        name: particulars,
        sku: existingProduct?.sku || body.sku || buildLegacySku(particulars),
        unitPrice: rate,
        taxRate: cgstPct + sgstPct,
    };
};

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get single product
exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create product
exports.createProduct = async (req, res) => {
    try {
        const product = await Product.create(buildProductPayload(req.body));
        res.status(201).json({ success: true, data: product });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const existingProduct = await Product.findById(req.params.id);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = await Product.findByIdAndUpdate(req.params.id, buildProductPayload(req.body, existingProduct), {
            new: true,
            runValidators: true,
        });
        res.status(200).json({ success: true, data: product });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        await product.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
