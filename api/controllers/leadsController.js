import Lead from '../models/Lead.js';
import ApiLead from '../models/ApiLead.js';
import * as phoneUtils from '../utils/phoneUtils.js';

export const getLeads = async (req, res, next) => {
    try {
        const leads = await Lead.find()
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) { next(error); }
};

export const getLeadById = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username');
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json(lead);
    } catch (error) { next(error); }
};

export const createLead = async (req, res, next) => {
    try {
        let { phone } = req.body;
        if (phone) {
            phone = String(phone).trim();
            req.body.phone = phone;

            const existingLead = await Lead.findOne({ phone: phone });
            if (existingLead) {
                return res.status(400).json({ message: `A contact with phone ${phone} already exists.` });
            }
        }
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
};

export const updateLead = async (req, res, next) => {
    try {
        const leadId = req.params.id;
        const updates = req.body;

        if (updates.phone) {
            updates.phone = String(updates.phone).trim();

            const existingWithPhone = await Lead.findOne({
                phone: updates.phone,
                _id: { $ne: leadId }
            });
            if (existingWithPhone) {
                return res.status(400).json({ message: `Another contact with phone ${updates.phone} already exists.` });
            }
        }

        if (updates.assignedTo) {
            const existingLead = await Lead.findById(leadId);
            if (existingLead && (!existingLead.assignedTo || existingLead.assignedTo.toString() !== updates.assignedTo)) {
                if (!updates.assignmentHistory) {
                    updates.assignmentHistory = existingLead.assignmentHistory || [];
                }
                updates.assignmentHistory.push({
                    userId: updates.assignedTo,
                    assignedBy: 'System (Update)'
                });
            }
        }

        const updatedLead = await Lead.findByIdAndUpdate(leadId, updates, { new: true })
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username');

        if (!updatedLead) return res.status(404).json({ message: 'Lead not found' });
        res.json(updatedLead);
    } catch (error) { next(error); }
};

export const deleteLead = async (req, res, next) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) { next(error); }
};

export const bulkDeleteLeads = async (req, res, next) => {
    try {
        const { ids } = req.body;
        await Lead.deleteMany({ _id: { $in: ids } });
        res.json({ message: 'Bulk delete successful' });
    } catch (error) { next(error); }
};

export const bulkAssignLeads = async (req, res, next) => {
    try {
        const { ids, userId } = req.body;
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
};

export const bulkUpdateLeads = async (req, res, next) => {
    try {
        const { ids, updates, addTags, removeTags } = req.body;
        const mongoUpdate = {};
        if (updates && Object.keys(updates).length > 0) mongoUpdate.$set = updates;
        if (addTags && addTags.length > 0) mongoUpdate.$addToSet = { tags: { $each: addTags } };
        if (removeTags && removeTags.length > 0) mongoUpdate.$pull = { tags: { $in: removeTags } };

        if (Object.keys(mongoUpdate).length === 0) {
            return res.status(400).json({ message: 'No updates provided' });
        }

        await Lead.updateMany({ _id: { $in: ids } }, mongoUpdate);
        res.json({ message: 'Bulk update successful' });
    } catch (error) { next(error); }
};

// --- API LEADS --- //
export const getApiLeads = async (req, res, next) => {
    try {
        const apiLeads = await ApiLead.find().sort({ createdAt: -1 });
        res.json(apiLeads);
    } catch (error) { next(error); }
};

export const updateApiLead = async (req, res, next) => {
    try {
        const leadId = req.params.id;
        const updates = req.body;
        if (updates.phone) {
            updates.phone = String(updates.phone).trim();

            const existingWithPhone = await ApiLead.findOne({
                phone: updates.phone,
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
};

export const deleteApiLead = async (req, res, next) => {
    try {
        await ApiLead.findByIdAndDelete(req.params.id);
        res.json({ message: 'API Lead deleted successfully' });
    } catch (error) { next(error); }
};

export const approveApiLead = async (req, res, next) => {
    try {
        const stagedLead = await ApiLead.findById(req.params.id).lean();
        if (!stagedLead) return res.status(404).json({ message: 'API Lead not found' });

        const existingInCRM = await Lead.findOne({ phone: stagedLead.phone.trim() });

        if (existingInCRM) {
            const incomingCars = stagedLead.carDetails || [];
            for (const incoming of incomingCars) {
                const isDuplicate = existingInCRM.carDetails.some(existing =>
                    existing.intent === incoming.intent &&
                    (existing.wantedCar?.brandName || '') === (incoming.wantedCar?.brandName || '') &&
                    (existing.wantedCar?.modelName || '') === (incoming.wantedCar?.modelName || '') &&
                    (existing.ownedCar?.brandName || '') === (incoming.ownedCar?.brandName || '') &&
                    (existing.ownedCar?.modelName || '') === (incoming.ownedCar?.modelName || '')
                );
                if (!isDuplicate) {
                    existingInCRM.carDetails.push(incoming);
                }
            }

            const existingNotes = new Set(existingInCRM.notes);
            for (const note of (stagedLead.notes || [])) {
                if (!existingNotes.has(note)) {
                    existingInCRM.notes.push(note);
                }
            }

            await existingInCRM.save();
            await ApiLead.findByIdAndDelete(req.params.id);

            const populated = await Lead.findById(existingInCRM._id)
                .populate('assignedTo', 'username')
                .populate('assignmentHistory.userId', 'username');
            return res.json({ merged: true, lead: populated });
        }

        const leadData = { ...stagedLead };
        if (leadData.countryCode && leadData.phone) {
            leadData.phone = `${leadData.countryCode}${leadData.phone}`;
        }
        delete leadData.countryCode;
        delete leadData._id;
        delete leadData.createdAt;
        delete leadData.updatedAt;
        delete leadData.existingInCrm;

        const newLead = new Lead(leadData);
        await newLead.save();
        await ApiLead.findByIdAndDelete(req.params.id);
        res.json({ merged: false, lead: newLead });
    } catch (error) { next(error); }
};

export const bulkUpdatePhonePrefix = async (req, res, next) => {
    try {
        const { ids, prefix } = req.body;
        if (prefix === undefined) return res.status(400).json({ message: 'Prefix is required' });

        const leadsToUpdate = await Lead.find({ _id: { $in: ids } });
        let updatedCount = 0;
        let skippedCount = 0;

        for (const lead of leadsToUpdate) {
            const { localNumber } = phoneUtils.parsePhoneNumber(lead.phone);
            const newPhone = `${prefix}${localNumber}`;

            // Check for collision if changing
            if (newPhone !== lead.phone) {
                const existing = await Lead.findOne({ phone: newPhone, _id: { $ne: lead._id } });
                if (existing) {
                    skippedCount++;
                    continue;
                }
                lead.phone = newPhone;
                await lead.save();
                updatedCount++;
            }
        }

        res.json({ 
            message: 'Bulk prefix update complete', 
            updatedCount, 
            skippedCount 
        });
    } catch (error) { next(error); }
};
