import mongoose from 'mongoose';

const smartListSchema = new mongoose.Schema({
    name: { type: String, required: true },
    filters: {
        search: { type: String },
        name: { type: String },
        phone: { type: String },
        place: { type: String },
        designation: { type: String },
        tag: { type: String },
        leadType: { type: String, enum: ['hot', 'warm', 'cold', 'all'] },
        status: { type: String },
        leadOrigin: { type: String },
        assignedTo: { type: String }, // User ID as string for easy matching
        selectedIds: [String],
        paymentStatus: { type: String },
        intent: { type: String },
        brandName: { type: String },
        modelName: { type: String },
        fuelType: { type: String },
        year: { type: String },
        kmDrivenValue: { type: String },
        kmDrivenOp: { type: String },
        amountValue: { type: String },
        amountOp: { type: String },
        date: { type: String }
    }
}, { timestamps: true });

export default mongoose.model('SmartList', smartListSchema);
