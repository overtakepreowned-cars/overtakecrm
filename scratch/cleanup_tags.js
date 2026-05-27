import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';
import Tag from '../api/models/Tag.js';

dotenv.config();

const resolveTags = async (tagNames) => {
    if (!tagNames || tagNames.length === 0) return [];
    const resolvedTags = [];
    for (const name of tagNames) {
        if (typeof name !== 'string') {
            resolvedTags.push(name);
            continue;
        }
        const normalized = name.trim().toLowerCase();
        if (!normalized) continue;
        const tag = await Tag.findOneAndUpdate(
            { name: normalized },
            { $setOnInsert: { name: normalized } },
            { upsert: true, new: true }
        );
        resolvedTags.push(tag._id);
    }
    return resolvedTags;
};

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const leads = await Lead.find({ tags: { $exists: true, $ne: [] } });
        console.log(`Found ${leads.length} leads with tags. Checking for string tags...`);

        let fixedCount = 0;
        for (const lead of leads) {
            if (!Array.isArray(lead.tags)) continue;
            const hasStrings = lead.tags.some(t => typeof t === 'string');
            if (hasStrings) {
                console.log(`Fixing lead: ${lead.name} (${lead._id})`);
                const resolved = await resolveTags(lead.tags);
                lead.tags = resolved;
                await lead.save();
                fixedCount++;
            }
        }

        console.log(`Cleanup complete. Fixed ${fixedCount} leads.`);
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanup();
