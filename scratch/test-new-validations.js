import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';
import ApiLead from '../api/models/ApiLead.js';
import User from '../api/models/User.js';
import Tag from '../api/models/Tag.js';
import { createLead, updateLead, approveApiLead } from '../api/controllers/leadsController.js';

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

const nextMock = (err) => {
    throw err;
};

async function testCreateLead() {
    console.log('\n--- Testing createLead Validation ---');

    // 1. Test missing country code
    const res1 = makeMockRes();
    await createLead({
        body: {
            name: 'Test No CC',
            phone: '9544404088'
        }
    }, res1, nextMock);
    console.log('Result 1 (Missing CC): Status =', res1.statusCode, 'Data =', res1.data);
    if (res1.statusCode !== 400 || res1.data.message !== 'Country code is missing') {
        throw new Error('Test 1 failed!');
    }

    // Clean up if somehow it existed
    await Lead.deleteOne({ phone: '+919544404088' });

    // 2. Test valid country code
    const res2 = makeMockRes();
    await createLead({
        body: {
            name: 'Test Valid CC',
            phone: '+919544404088'
        }
    }, res2, nextMock);
    console.log('Result 2 (Valid CC): Status =', res2.statusCode, 'Data =', res2.data ? res2.data.phone : null);
    if (res2.statusCode !== 201 || res2.data.phone !== '+919544404088') {
        throw new Error('Test 2 failed!');
    }

    return res2.data._id;
}

async function testUpdateLead(leadId) {
    console.log('\n--- Testing updateLead Validation ---');

    // 1. Test update to invalid phone (no cc)
    const res1 = makeMockRes();
    await updateLead({
        params: { id: leadId },
        body: {
            phone: '9544404089'
        }
    }, res1, nextMock);
    console.log('Result 1 (Invalid update): Status =', res1.statusCode, 'Data =', res1.data);
    if (res1.statusCode !== 400 || res1.data.message !== 'Country code is missing') {
        throw new Error('Update Test 1 failed!');
    }

    // Clean up second number
    await Lead.deleteOne({ phone: '+919544404089' });

    // 2. Test update to valid phone
    const res2 = makeMockRes();
    await updateLead({
        params: { id: leadId },
        body: {
            phone: '+919544404089'
        }
    }, res2, nextMock);
    console.log('Result 2 (Valid update): Status =', res2.statusCode, 'Data =', res2.data ? res2.data.phone : null);
    if (res2.statusCode !== 200 || res2.data.phone !== '+919544404089') {
        throw new Error('Update Test 2 failed!');
    }
}

async function testApproveApiLead() {
    console.log('\n--- Testing approveApiLead Validation ---');

    // Create an API lead without a country code
    const badApiLead = new ApiLead({
        name: 'Bad Api Lead',
        phone: '9544404090',
        countryCode: ''
    });
    await badApiLead.save();

    // Create an API lead with a valid country code
    const goodApiLead = new ApiLead({
        name: 'Good Api Lead',
        phone: '9544404091',
        countryCode: '+91'
    });
    await goodApiLead.save();

    // 1. Test approving the bad lead (should fail)
    const res1 = makeMockRes();
    await approveApiLead({
        params: { id: badApiLead._id }
    }, res1, nextMock);
    console.log('Result 1 (Approve Bad): Status =', res1.statusCode, 'Data =', res1.data);
    if (res1.statusCode !== 400 || !res1.data.message.includes('Country code is missing')) {
        throw new Error('Approve Test 1 failed!');
    }

    // Clean up any lead with that phone
    await Lead.deleteOne({ phone: '+919544404091' });

    // 2. Test approving the good lead (should succeed)
    const res2 = makeMockRes();
    await approveApiLead({
        params: { id: goodApiLead._id }
    }, res2, nextMock);
    console.log('Result 2 (Approve Good): Status =', res2.statusCode, 'Data =', res2.data ? res2.data.lead.phone : null);
    if (res2.statusCode !== 200 || res2.data.lead.phone !== '+919544404091') {
        throw new Error('Approve Test 2 failed!');
    }

    // Clean up
    await ApiLead.deleteOne({ _id: badApiLead._id });
    await Lead.deleteOne({ phone: '+919544404091' });
}

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log('Connected to Database');

    try {
        const leadId = await testCreateLead();
        await testUpdateLead(leadId);
        await testApproveApiLead();
        
        // Clean up final test lead
        if (leadId) {
            await Lead.deleteOne({ _id: leadId });
        }
        console.log('\nALL TESTS PASSED SUCCESSFULLY!');
    } catch (e) {
        console.error('Test run failed:', e);
    } finally {
        await mongoose.connection.close();
    }
}

run().catch(console.error);
