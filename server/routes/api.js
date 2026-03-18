import express from 'express';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import SmartList from '../models/SmartList.js';
import Tag from '../models/Tag.js';
import ApiLead from '../models/ApiLead.js';

const router = express.Router();

// --- USERS --- //
router.get('/users', async (req, res, next) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) { next(error); }
});

router.post('/users', async (req, res, next) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) { next(error); }
});

router.put('/users/:id', async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) { next(error); }
});

router.delete('/users/:id', async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) { next(error); }
});

// --- AUTH --- //
router.post('/auth/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        let targetRole = '';
        
        // Credentials are driven by .env — change ADMIN_USERNAME/PASSWORD there
        const adminUser = process.env.ADMIN_USERNAME;
        const adminPass = process.env.ADMIN_PASSWORD;
        const salesUser = process.env.SALES_USERNAME;
        const salesPass = process.env.SALES_PASSWORD;

        if (username === adminUser && password === adminPass) {
            targetRole = 'admin';
        } else if (username === salesUser && password === salesPass) {
            targetRole = 'sales';
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (targetRole === 'admin') {
            let user = await User.findOne({ role: 'admin' });
            if (!user) {
                user = {
                    _id: 'default-admin-id',
                    username: 'Administrator',
                    role: 'admin'
                };
            }
            return res.json(user);
        } else if (targetRole === 'sales') {
            // As per requirements: "all sales rep login through one common sales rep account"
            // "dont give sales rep names on account"
            return res.json({
                _id: 'common-sales-rep',
                username: 'Sales Team',
                role: 'sales'
            });
        }
    } catch (error) { next(error); }
});

// --- TAGS --- //
router.get('/tags', async (req, res, next) => {
    try {
        const tags = await Tag.find().sort({ createdAt: -1 });
        res.json(tags);
    } catch (error) { next(error); }
});

router.post('/tags', async (req, res, next) => {
    try {
        const tag = new Tag(req.body);
        await tag.save();
        res.status(201).json(tag);
    } catch (error) { next(error); }
});

router.delete('/tags/:id', async (req, res, next) => {
    try {
        await Tag.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) { next(error); }
});

// --- SMART LISTS --- //
router.get('/smartlists', async (req, res, next) => {
    try {
        const lists = await SmartList.find().sort({ createdAt: -1 });
        res.json(lists);
    } catch (error) { next(error); }
});

router.post('/smartlists', async (req, res, next) => {
    try {
        const list = new SmartList(req.body);
        await list.save();
        res.status(201).json(list);
    } catch (error) { next(error); }
});

router.delete('/smartlists/:id', async (req, res, next) => {
    try {
        await SmartList.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) { next(error); }
});

// --- LEADS --- //
router.get('/leads', async (req, res, next) => {
    try {
        const leads = await Lead.find()
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) { next(error); }
});

router.get('/leads/:id', async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username');
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json(lead);
    } catch (error) { next(error); }
});

router.post('/leads', async (req, res, next) => {
    try {
        const { phone } = req.body;
        // Check for existing lead with same phone
        if (phone) {
            const existingLead = await Lead.findOne({ phone: phone.trim() });
            if (existingLead) {
                return res.status(400).json({ message: `A contact with phone ${phone} already exists.` });
            }
        }

        // If assigned immediately on creation
        if (req.body.assignedTo) {
            req.body.assignmentHistory = [{
                userId: req.body.assignedTo,
                assignedBy: 'System (Creation)'
            }];
        }
        const lead = new Lead(req.body);
        await lead.save();
        res.status(201).json(lead);
    } catch (error) { next(error); }
});

router.put('/leads/:id', async (req, res, next) => {
    try {
        const leadId = req.params.id;
        const updates = req.body;

        // Check for phone uniqueness if updating phone
        if (updates.phone) {
            const existingWithPhone = await Lead.findOne({
                phone: updates.phone.trim(),
                _id: { $ne: leadId }
            });
            if (existingWithPhone) {
                return res.status(400).json({ message: `Another contact with phone ${updates.phone} already exists.` });
            }
        }

        // Check if assignment changed
        if (updates.assignedTo) {
            const existingLead = await Lead.findById(leadId);
            if (existingLead && (!existingLead.assignedTo || existingLead.assignedTo.toString() !== updates.assignedTo)) {
                // Push new assignment record
                const newRecord = {
                    userId: updates.assignedTo,
                    assignedBy: 'System (Update)'
                };
                if (!updates.assignmentHistory) {
                    updates.assignmentHistory = existingLead.assignmentHistory || [];
                }
                updates.assignmentHistory.push(newRecord);
            }
        }

        const updatedLead = await Lead.findByIdAndUpdate(leadId, updates, { new: true })
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username');

        if (!updatedLead) return res.status(404).json({ message: 'Lead not found' });
        res.json(updatedLead);
    } catch (error) { next(error); }
});

router.delete('/leads/:id', async (req, res, next) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) { next(error); }
});

// --- BULK ACTIONS --- //
router.post('/leads/bulk-delete', async (req, res, next) => {
    try {
        const { ids } = req.body;
        await Lead.deleteMany({ _id: { $in: ids } });
        res.json({ message: 'Bulk delete successful' });
    } catch (error) { next(error); }
});

router.post('/leads/bulk-assign', async (req, res, next) => {
    try {
        const { ids, userId } = req.body;

        // Update many and also should ideally update assignmentHistory, 
        // but for bulk updating many histories is complex in a single query.
        // We will update the leads and add a generic history record to each.
        const leadsToUpdate = await Lead.find({ _id: { $in: ids } });

        const updatePromises = leadsToUpdate.map(lead => {
            lead.assignedTo = userId;
            lead.assignmentHistory.push({
                userId,
                assignedBy: 'System (Bulk Assignment)'
            });
            return lead.save();
        });

        await Promise.all(updatePromises);
        res.json({ message: 'Bulk assignment successful' });
    } catch (error) { next(error); }
});

router.post('/leads/bulk-update', async (req, res, next) => {
    try {
        const { ids, updates, addTags, removeTags } = req.body;
        const mongoUpdate = {};

        if (updates && Object.keys(updates).length > 0) mongoUpdate.$set = updates;
        if (addTags && addTags.length > 0) mongoUpdate.$addToSet = { tags: { $each: addTags } };
        if (removeTags && removeTags.length > 0) mongoUpdate.$pull = { tags: { $in: removeTags } };

        if (Object.keys(mongoUpdate).length === 0) {
            return res.status(400).json({ message: 'No updates provided' });
        }

        await Lead.updateMany(
            { _id: { $in: ids } },
            mongoUpdate
        );

        res.json({ message: 'Bulk update successful' });
    } catch (error) { next(error); }
});

// --- API LEADS & WEBHOOKS --- //
router.get('/api-leads', async (req, res, next) => {
    try {
        const apiLeads = await ApiLead.find().sort({ createdAt: -1 });
        res.json(apiLeads);
    } catch (error) { next(error); }
});

router.put('/api-leads/:id', async (req, res, next) => {
    try {
        const leadId = req.params.id;
        const updates = req.body;

        if (updates.phone) {
            const existingWithPhone = await ApiLead.findOne({
                phone: updates.phone.trim(),
                _id: { $ne: leadId }
            });
            if (existingWithPhone) {
                return res.status(400).json({ message: `Another pending contact with phone ${updates.phone} already exists.` });
            }
        }

        const updatedLead = await ApiLead.findByIdAndUpdate(leadId, updates, { new: true });
        if (!updatedLead) return res.status(404).json({ message: 'API Lead not found' });
        res.json(updatedLead);
    } catch (error) { next(error); }
});

router.delete('/api-leads/:id', async (req, res, next) => {
    try {
        await ApiLead.findByIdAndDelete(req.params.id);
        res.json({ message: 'API Lead deleted successfully' });
    } catch (error) { next(error); }
});

router.post('/api-leads/:id/approve', async (req, res, next) => {
    try {
        const leadId = req.params.id;
        const stagedLead = await ApiLead.findById(leadId).lean();

        if (!stagedLead) return res.status(404).json({ message: 'API Lead not found' });

        if (stagedLead.existingInCrm) {
            // ── MERGE PATH ── Phone already in main CRM; merge new data in
            const existingLead = await Lead.findOne({ phone: stagedLead.phone.trim() });
            if (!existingLead) {
                // Edge case: was flagged existing but lead was deleted since — fall through to create
                stagedLead.existingInCrm = false;
            } else {
                // Append new car details (avoid exact duplicates by intent+brand+model)
                const incomingCars = stagedLead.carDetails || [];
                for (const incoming of incomingCars) {
                    const isDuplicate = existingLead.carDetails.some(existing =>
                        existing.intent === incoming.intent &&
                        (existing.wantedCar?.brandName || '') === (incoming.wantedCar?.brandName || '') &&
                        (existing.wantedCar?.modelName || '') === (incoming.wantedCar?.modelName || '') &&
                        (existing.ownedCar?.brandName || '') === (incoming.ownedCar?.brandName || '') &&
                        (existing.ownedCar?.modelName || '') === (incoming.ownedCar?.modelName || '')
                    );
                    if (!isDuplicate) {
                        existingLead.carDetails.push(incoming);
                    }
                }

                // Append new notes (avoid exact duplicates)
                const existingNotes = new Set(existingLead.notes);
                for (const note of (stagedLead.notes || [])) {
                    if (!existingNotes.has(note)) {
                        existingLead.notes.push(note);
                    }
                }

                await existingLead.save();
                await ApiLead.findByIdAndDelete(leadId);

                const populated = await Lead.findById(existingLead._id)
                    .populate('assignedTo', 'username')
                    .populate('assignmentHistory.userId', 'username');
                return res.json({ merged: true, lead: populated });
            }
        }

        // ── CREATE PATH ── New phone; move ApiLead → Lead
        const { _id, createdAt, updatedAt, existingInCrm, ...leadData } = stagedLead;

        // Final duplicate check (race condition guard)
        const duplicate = await Lead.findOne({ phone: stagedLead.phone.trim() });
        if (duplicate) {
            return res.status(409).json({ message: `A contact with phone ${stagedLead.phone} already exists in the CRM.` });
        }

        const newLead = new Lead(leadData);
        await newLead.save();
        await ApiLead.findByIdAndDelete(leadId);

        res.json({ merged: false, lead: newLead });
    } catch (error) { next(error); }
});

router.post('/webhooks/leads', async (req, res, next) => {
    try {
        const { leadOrigin, leadinfo } = req.body;
        
        if (!leadinfo) {
             return res.status(400).json({ message: 'leadinfo object is required for webhook submission.' });
        }

        const name = leadinfo.first_name || leadinfo.name;
        // Strip non-numeric chars for phone match checking
        const phone = leadinfo.whatsapp_phone ? leadinfo.whatsapp_phone.replace(/\D/g, '') : (leadinfo.phone ? leadinfo.phone.replace(/\D/g, '') : null);
        
        if (!name || !phone) {
            return res.status(400).json({ message: 'Name and phone inside leadinfo are required.' });
        }

        // Reject only if there's already a pending API lead with same phone (avoid duplicate staged leads)
        const existingApiLead = await ApiLead.findOne({ phone: phone.trim() });
        if (existingApiLead) {
            return res.status(409).json({ message: 'An API lead with this phone number is already pending review.' });
        }

        // Check if phone already exists in main CRM — flag it rather than reject it
        const existingMainLead = await Lead.findOne({ phone: phone.trim() });
        const existingInCrm = !!existingMainLead;

        // Validate leadOrigin against Mongoose Enum (now lowercase)
        const validOrigins = ['whatsapp', 'insta', 'fb', 'walk-in', 'tele', 'referral', 'web', 'olx', 'other'];
        let finalOrigin = (leadOrigin || leadinfo.leadOrigin || 'other').toLowerCase();
        if (!validOrigins.includes(finalOrigin)) {
            finalOrigin = 'other';
        }

        // Check for Custom Fields mapping to map into carDetails 
        const carDetailsArray = [];
        const custom = leadinfo.custom_fields || {};
        const intent = custom.intention ? custom.intention.toLowerCase() : null;
        
        if (intent === 'buying' || intent === 'selling' || intent === 'exchange') {
            const carDetail = { intent };
            
            if (intent === 'buying') {
                carDetail.wantedCar = {
                    brandName: custom['buy brand'],
                    modelName: custom['buy model']
                };
            } else if (intent === 'selling') {
                carDetail.ownedCar = {
                    brandName: custom['sell brand'],
                    modelName: custom['sell model'],
                    year: custom['sell model year'],
                    kmDriven: custom['sell model km']
                };
            } else if (intent === 'exchange') {
                carDetail.ownedCar = {
                    brandName: custom['exchange car brand owning'],
                    modelName: custom['exchange car model owning']
                };
                carDetail.wantedCar = {
                    brandName: custom['exchange car brand looking'],
                    modelName: custom['exchange car model looking']
                };
            }
            carDetailsArray.push(carDetail);
        }

        const notesArray = [];
        if (custom.Note) {
            notesArray.push(custom.Note);
        }

        // Construct final mapping — include existingInCrm flag
        const leadData = {
           name: name.trim(),
           phone: phone.trim(),
           leadOrigin: finalOrigin,
           notes: notesArray,
           carDetails: carDetailsArray,
           existingInCrm
        };

        const apiLead = new ApiLead(leadData);
        await apiLead.save();

        res.status(201).json({
            status: 'success',
            message: existingInCrm
                ? 'Lead captured. This phone already exists in CRM — will merge on approval.'
                : 'Lead successfully captured and staged via webhook.',
            data: {
                id: apiLead._id,
                name: apiLead.name,
                phone: apiLead.phone,
                leadOrigin: apiLead.leadOrigin,
                existingInCrm,
                vehiclesEnquired: apiLead.carDetails.length
            }
        });
    } catch (error) { next(error); }
});

export default router;
