import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';
import ApiLead from '../api/models/ApiLead.js';
import mongoose from 'mongoose';

dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

async function login() {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin@overtake',
            password: 'admin@overtake'
        })
    });
    if (!res.ok) {
        throw new Error(`Login failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.token;
}

async function approveApiLead(id, token) {
    const res = await fetch(`${BASE_URL}/api-leads/${id}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return {
        status: res.status,
        data: await res.json()
    };
}

async function updateApiLead(id, updates, token) {
    const res = await fetch(`${BASE_URL}/api-leads/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
    });
    return {
        status: res.status,
        data: await res.json()
    };
}

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log('Connected to DB');

    const token = await login();
    console.log('Logged in successfully, token retrieved');

    // Retrieve the current bad and good test leads from database
    const badLead = await ApiLead.findOne({ name: 'webhook test bad', phone: '5500000001' });
    const goodLead = await ApiLead.findOne({ name: 'webhook test good', phone: '8000000001' });

    if (!badLead || !goodLead) {
        throw new Error('Test leads not found in database. Make sure the webhook curl commands succeeded.');
    }

    console.log(`Bad API Lead ID: ${badLead._id}, Good API Lead ID: ${goodLead._id}`);

    // Clean up any existing leads in CRM
    await Lead.deleteOne({ phone: '+915500000001' });
    await Lead.deleteOne({ phone: '+918000000001' });

    // Step 1: Try to approve bad lead (should fail)
    console.log('\nStep 1: Attempting to approve bad lead (missing country code)...');
    const appBadRes = await approveApiLead(badLead._id, token);
    console.log('Response Status:', appBadRes.status);
    console.log('Response Data:', appBadRes.data);
    if (appBadRes.status !== 400 || !appBadRes.data.message.includes('Country code is missing')) {
        throw new Error('Step 1 validation failed!');
    }

    // Step 2: Edit the bad lead to add a country code (simulating frontend edit)
    console.log('\nStep 2: Updating bad lead with combined phone "+915500000001"...');
    const updateRes = await updateApiLead(badLead._id, { phone: '+915500000001' }, token);
    console.log('Response Status:', updateRes.status);
    console.log('Response Data:', updateRes.data);
    if (updateRes.status !== 200) {
        throw new Error('Step 2 update failed!');
    }

    // Step 3: Approve the now-corrected bad lead (should succeed)
    console.log('\nStep 3: Approving corrected bad lead...');
    const appCorrectedRes = await approveApiLead(badLead._id, token);
    console.log('Response Status:', appCorrectedRes.status);
    console.log('Response Data:', appCorrectedRes.data);
    if (appCorrectedRes.status !== 200 || appCorrectedRes.data.lead.phone !== '+915500000001') {
        throw new Error('Step 3 approval failed!');
    }

    // Step 4: Approve the good lead (should succeed directly)
    console.log('\nStep 4: Approving good lead directly...');
    const appGoodRes = await approveApiLead(goodLead._id, token);
    console.log('Response Status:', appGoodRes.status);
    console.log('Response Data:', appGoodRes.data);
    if (appGoodRes.status !== 200 || appGoodRes.data.lead.phone !== '+918000000001') {
        throw new Error('Step 4 approval failed!');
    }

    console.log('\nINTEGRATION TESTS PASSED SUCCESSFULLY!');
    await mongoose.connection.close();
}

run().catch(async (e) => {
    console.error('Integration test run failed:', e);
    await mongoose.connection.close();
});
