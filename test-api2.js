import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './api/models/User.js'; // This registers the User model!
import { getWorkingReport } from './api/controllers/leadsController.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');

    const req = {
        query: { date: '2026-06-05' }
    };
    const res = {
        status: (code) => res,
        json: (data) => {
            console.log("JSON Output length of cumulativeData:", data.cumulativeData.length);
            console.log("JSON Output length of dailyData:", data.dailyData.length);
            console.log("Sample dailyData:", data.dailyData[0]);
            process.exit(0);
        }
    };
    const next = (err) => {
        console.error("Error:", err);
        process.exit(1);
    };

    await getWorkingReport(req, res, next);
}
run().catch(console.error);
