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

    // Login as admin to get token
    const loginRes = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@overtake', password: 'admin@overtake' })
    });
    
    if (!loginRes.ok) {
        console.error("Login failed:", await loginRes.text());
        process.exit(1);
    }
    
    const { token } = await loginRes.json();
    console.log("Logged in successfully. Token obtained.");

    const leadId = '6a38e871b16ff39485b4aa9e'; // webhook browser success
    
    console.log(`\nCalling POST /api-leads/${leadId}/approve...`);
    const approveRes = await fetch(`${BASE_URL}/api-leads/${leadId}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    console.log("Response Status:", approveRes.status);
    const data = await approveRes.json();
    console.log("Response Data:", data);

    if (approveRes.ok) {
        console.log("Success! Checking if Lead exists in Lead collection:");
        const lead = await Lead.findOne({ phone: '+919876543222' }).populate('assignedTo', 'username').lean();
        console.log("Lead in DB:", lead);
    }

    process.exit(0);
}
run().catch(console.error);
