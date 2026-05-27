import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

// Helper to convert expressions
const convertToDouble = (expr) => ({
    $convert: {
        input: expr,
        to: "double",
        onError: 0,
        onNull: 0
    }
});

async function runTest() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }), 'leads');

    // 1. Test Date Filter (e.g. today's date)
    const dateStr = new Date().toISOString().split('T')[0];
    const dateStart = new Date(dateStr);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    console.log(`Running Date Query for range: ${dateStart.toISOString()} to ${dateEnd.toISOString()}...`);
    const dateQuery = {
        createdAt: {
            $gte: dateStart,
            $lt: dateEnd
        }
    };
    const dateCount = await Lead.countDocuments(dateQuery);
    console.log(`Leads created today count: ${dateCount}`);

    // 2. Test KM Driven query using $expr conversions
    console.log('Running KM Driven Query (Below 120000 km)...');
    const kmExpr = {
        $anyElementTrue: {
            $map: {
                input: "$carDetails",
                as: "car",
                in: {
                    $or: [
                        {
                            $lt: [
                                convertToDouble("$$car.kmDriven"),
                                120000
                            ]
                        },
                        {
                            $lt: [
                                convertToDouble("$$car.wantedCar.kmDriven"),
                                120000
                            ]
                        },
                        {
                            $lt: [
                                convertToDouble("$$car.ownedCar.kmDriven"),
                                120000
                            ]
                        }
                    ]
                }
            }
        }
    };
    const kmCount = await Lead.countDocuments({ $expr: kmExpr });
    console.log(`Leads with KM < 120,000 count: ${kmCount}`);

    // 3. Test Budget / Amount query using $expr conversions
    console.log('Running Budget Query (Above 500000)...');
    const amountExpr = {
        $anyElementTrue: {
            $map: {
                input: "$carDetails",
                as: "car",
                in: {
                    $or: [
                        {
                            $gt: [
                                convertToDouble("$$car.amount"),
                                500000
                            ]
                        },
                        {
                            $gt: [
                                convertToDouble("$$car.wantedCar.amount"),
                                500000
                            ]
                        },
                        {
                            $gt: [
                                convertToDouble("$$car.ownedCar.amount"),
                                500000
                            ]
                        }
                    ]
                }
            }
        }
    };
    const amountCount = await Lead.countDocuments({ $expr: amountExpr });
    console.log(`Leads with budget > 500,000 count: ${amountCount}`);

    console.log('All tests passed successfully without database exceptions!');
    await mongoose.disconnect();
}

runTest().catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
});
