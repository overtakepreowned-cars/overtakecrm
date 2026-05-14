import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tag from '../api/models/Tag.js';

dotenv.config();

async function checkTags() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI.split('@')[1]); // Show only cluster part
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');
        
        const tags = await Tag.find();
        console.log(`Found ${tags.length} tags in the database:`);
        tags.forEach(t => console.log(` - ${t.name} (${t.color})`));
        
        await mongoose.disconnect();
        console.log('Disconnected.');
    } catch (err) {
        console.error('Error:', err);
    }
}

checkTags();
