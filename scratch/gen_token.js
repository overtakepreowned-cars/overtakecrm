import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

async function generateToken() {
    try {
        await mongoose.connect(MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({ username: String, role: String }));
        const user = await User.findOne();
        if (!user) {
            console.log('No user found');
            return;
        }
        console.log('Found user:', user.username, 'Role:', user.role);
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
        console.log('Token:', token);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

generateToken();
