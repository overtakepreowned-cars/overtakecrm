import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lead from '../api/models/Lead.js';
import ApiLead from '../api/models/ApiLead.js';
import User from '../api/models/User.js';

dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log("Connected to Database");

    // Login as admin
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin@overtake', password: 'admin@overtake' })
    });
    
    if (!loginRes.ok) {
        console.error("Login failed:", await loginRes.text());
        process.exit(1);
    }
    
    const { token } = await loginRes.json();
    console.log("Logged in successfully.");

    // Find browser leads
    const browserLeads = await ApiLead.find({ name: /browser/i }).lean();
    console.log("Browser Leads to approve:", browserLeads.map(l => ({ id: l._id, name: l.name, phone: l.phone })));

    for (const lead of browserLeads) {
        console.log(`\nApproving lead: ${lead.name} (${lead._id})...`);
        const approveRes = await fetch(`${BASE_URL}/api-leads/${lead._id}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Status:", approveRes.status);
        const resData = await approveRes.json();
        console.log("Response:", resData);

        if (approveRes.ok) {
            const saved = await Lead.findOne({ name: lead.name }).populate('assignedTo', 'username').lean();
            console.log("Approved and Saved Lead in Lead collection:", saved);
        }
    }

    await mongoose.connection.close();
}
run().catch(console.error);
