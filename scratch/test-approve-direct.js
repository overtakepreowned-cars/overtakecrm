import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';
import ApiLead from '../api/models/ApiLead.js';
import User from '../api/models/User.js';
import Tag from '../api/models/Tag.js';
import { approveApiLead } from '../api/controllers/leadsController.js';

dotenv.config();

// Simple mock response generator
const makeMockRes = () => {
    const res = {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(val) {
            this.data = val;
            return this;
        }
    };
    return res;
};

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log("Connected to DB");

    // Find the staged API Lead 'webhook test good' (phone: 9876543210, countryCode: +91)
    const stagedLead = await ApiLead.findOne({ name: 'webhook test good', phone: '9876543210' });
    if (!stagedLead) {
        console.error("Staged lead not found in ApiLead collection!");
        process.exit(1);
    }
    console.log("Found Staged Lead:", stagedLead);

    // Clean up any existing lead in main CRM with phone +919876543210
    await Lead.deleteOne({ phone: '+919876543210' });
    console.log("Deleted any existing lead with phone +919876543210 in Lead collection");

    const res = makeMockRes();
    const req = {
        params: { id: stagedLead._id.toString() }
    };

    console.log("\nCalling approveApiLead controller...");
    try {
        await approveApiLead(req, res, (err) => {
            if (err) throw err;
        });
        console.log("Response Status:", res.statusCode);
        console.log("Response Data:", res.data);
        
        // Now check if it exists in Lead collection
        const approvedLead = await Lead.findOne({ phone: '+919876543210' });
        console.log("\nAfter approval, searching in Lead collection:");
        console.log(approvedLead);
        
        const apiLeadExists = await ApiLead.findById(stagedLead._id);
        console.log("After approval, searching in ApiLead collection (should be null):");
        console.log(apiLeadExists);

    } catch (e) {
        console.error("Error during approval execution:", e);
    }

    await mongoose.connection.close();
}
run().catch(console.error);
