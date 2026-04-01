import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
    brandName: { type: String, lowercase: true },
    modelName: { type: String, lowercase: true },
    fuelType: { type: String, lowercase: true },
    kmDriven: { type: String },
    year: { type: String },
    amount: { type: String }
});

const carDetailSchema = new mongoose.Schema({
    // Legacy support (to avoid breaking old flat structure)
    brandName: { type: String, lowercase: true },
    modelName: { type: String, lowercase: true },
    fuelType: { type: String, lowercase: true },
    kmDriven: { type: String },

    // New nested structure
    wantedCar: vehicleSchema,
    ownedCar: vehicleSchema,

    additionalReqs: { type: String },
    intent: { type: String, enum: ['buying', 'selling', 'exchange'] }
});

const assignmentRecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: String } // System or another user ID
});

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    place: { type: String, lowercase: true },
    designation: { type: String, lowercase: true },
    leadOrigin: {
        type: String,
        enum: ['whatsapp', 'insta', 'fb', 'walk-in', 'tele', 'referral', 'web', 'olx', 'other'],
        lowercase: true,
        default: 'other'
    },
    enquiredVehicle: { type: String, lowercase: true },
    leadType: { type: String, enum: ['hot', 'warm', 'cold'], default: 'hot' },
    status: { type: String, enum: ['new', 'contacted', 'booking_confirmed', 'deal_closed'], default: 'new' },
    notes: [{ type: String }],
    tags: [{ type: String, lowercase: true }],

    carDetails: [carDetailSchema],

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignmentHistory: [assignmentRecordSchema],

    followupDate: { type: Date },
    followupNote: [{ type: String }],
    followupCount: { type: Number, default: 0 },
    followupHistory: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        scheduledDate: { type: Date },
        completedDate: { type: Date, default: Date.now },
        newScheduledDate: { type: Date },
        note: { type: String },
        wasMissed: { type: Boolean, default: false },
        result: { type: String, enum: ['responded', 'not_responded', 'rescheduled'], default: 'responded' }
    }],
    paymentStatus: {
        type: String,
        enum: ['advance payment', 'full payment', ''],
        lowercase: true,
        default: ''
    },
    bookMethod: {
        type: String,
        enum: ['loan', 'cash', ''],
        lowercase: true,
        default: ''
    },
    referredBy: { type: String }
}, { timestamps: true });

export default mongoose.model('Lead', leadSchema);
