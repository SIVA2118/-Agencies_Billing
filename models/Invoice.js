const mongoose = require('mongoose');

// ── Item sub-schema ──────────────────────────────────────────────────────────
const ItemSchema = new mongoose.Schema({
    slNo: { type: Number, required: true },
    particulars: { type: String, required: true },
    qty: { type: String, required: true },   // e.g. "2 CS30" or "12 Pcs"
    rate: { type: Number, required: true },
    grossAmt: { type: Number, required: true },
    cgstPct: { type: Number, required: true },
    cgstAmt: { type: Number, required: true },
    sgstPct: { type: Number, required: true },
    sgstAmt: { type: Number, required: true },
    total: { type: Number, required: true },
});

// ── Tax summary row sub-schema ───────────────────────────────────────────────
const TaxSummarySchema = new mongoose.Schema({
    cgstPct: { type: Number },
    cgstValue: { type: Number },
    sgstPct: { type: Number },
    sgstValue: { type: Number },
    taxable: { type: Number },
});

// ── Main Invoice schema ──────────────────────────────────────────────────────
const InvoiceSchema = new mongoose.Schema(
    {
        // ── Seller details ──────────────────────────────────────────────────────
        seller: {
            name: { type: String, required: true, default: 'Shri Sastik Agencies' },
            address: { type: String, required: true },
            city: { type: String },
            state: { type: String },
            pincode: { type: String },
            phone: { type: String },
            gstin: { type: String },
            fssaiNo: { type: String },
            pan: { type: String },
        },

        // ── Buyer details ───────────────────────────────────────────────────────
        buyer: {
            name: { type: String, required: true },
            address: { type: String },
            route: { type: String },
            phone: { type: String },
        },

        // ── Invoice meta ────────────────────────────────────────────────────────
        invoiceNo: { type: String, required: true, unique: true },
        invoiceDate: { type: Date, required: true },
        Adminid: { type: String },
        employeeId: { type: String },
        employeeName: { type: String },

        // ── Line items ──────────────────────────────────────────────────────────
        items: { type: [ItemSchema], required: true },

        // ── Totals ──────────────────────────────────────────────────────────────
        totalUnits: { type: Number },
        totalDiscountValue: { type: Number, default: 0 },
        totalTax: { type: Number },

        // ── Tax summary rows ────────────────────────────────────────────────────
        taxSummary: [TaxSummarySchema],
        cgstTotal: { type: Number },
        sgstTotal: { type: Number },

        // ── Final amounts ───────────────────────────────────────────────────────
        netAmount: { type: Number },
        roundedOff: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Invoice', InvoiceSchema);
