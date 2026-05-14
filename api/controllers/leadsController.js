import Lead from '../models/Lead.js';
import ApiLead from '../models/ApiLead.js';
import Tag from '../models/Tag.js';
import * as phoneUtils from '../utils/phoneUtils.js';
import { findBestMatch } from '../utils/mappingUtils.js';

const resolveTags = async (tagNames) => {
    if (!tagNames || tagNames.length === 0) return [];
    const resolvedTags = [];
    for (const name of tagNames) {
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

export const importLeads = async (req, res, next) => {
    try {
        const { rows, mapping, fixedFields, globalTags } = req.body;
        if (!rows || !Array.isArray(rows) || !mapping) {
            return res.status(400).json({ message: 'Invalid import data' });
        }

        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            completedRows: [],
            failedRows: []
        };

        const enumFields = {
            leadOrigin: ['whatsapp', 'insta', 'fb', 'walk-in', 'tele', 'referral', 'web', 'olx', 'team-tech', 'other'],
            leadType: ['hot', 'warm', 'cold'],
            status: ['new', 'contacted', 'booking_confirmed', 'deal_closed'],
            intent: ['buying', 'selling', 'exchange'],
            paymentStatus: ['advance payment', 'full payment'],
            bookMethod: ['loan', 'cash'],
            fuelType: ['petrol', 'diesel', 'electric', 'hybrid', 'cng']
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const leadData = {};
                const carDetail = {
                    wantedCar: {},
                    ownedCar: {}
                };
                
                // Apply fixed fields first
                if (fixedFields) {
                    for (const [field, value] of Object.entries(fixedFields)) {
                        if (['intent', 'brandName', 'modelName', 'fuelType', 'kmDriven', 'year', 'amount'].includes(field)) {
                            carDetail[field] = value;
                        } else {
                            leadData[field] = value;
                        }
                    }
                }
                
                let hasCarData = !!carDetail.intent || !!carDetail.brandName;

                // Map fields
                let mappedCountryCode = null;
                for (const [crmField, sheetColumns] of Object.entries(mapping)) {
                    if (!sheetColumns) continue;
                    
                    const columns = Array.isArray(sheetColumns) ? sheetColumns : [sheetColumns];
                    const values = columns
                        .map(col => row[col])
                        .filter(val => val !== undefined && val !== null)
                        .map(val => String(val).trim())
                        .filter(val => val !== '');

                    if (values.length === 0) continue;

                    if (crmField === 'countryCode') {
                        mappedCountryCode = values[0];
                    } else if (enumFields[crmField]) {
                        leadData[crmField] = findBestMatch(values[0], enumFields[crmField]) || leadData[crmField];
                    } else if (crmField.startsWith('wantedCar.') || crmField.startsWith('ownedCar.')) {
                        const [carType, subField] = crmField.split('.');
                        let finalValue = values[0];
                        if (subField === 'fuelType') {
                            finalValue = findBestMatch(values[0], enumFields.fuelType) || values[0];
                        }
                        carDetail[carType][subField] = finalValue;
                        hasCarData = true;
                    } else if (['brandName', 'modelName', 'fuelType', 'kmDriven', 'year', 'amount', 'intent', 'additionalReqs'].includes(crmField)) {
                        let finalValue = values[0];
                        if (crmField === 'fuelType') finalValue = findBestMatch(values[0], enumFields.fuelType) || values[0];
                        if (crmField === 'intent') finalValue = findBestMatch(values[0], enumFields.intent) || values[0];
                        
                        carDetail[crmField] = finalValue;
                        hasCarData = true;
                    } else if (crmField === 'notes') {
                        leadData.notes = values;
                    } else if (crmField === 'tags') {
                        const rowTags = values.flatMap(v => v.split(',').map(t => t.trim().toLowerCase())).filter(t => t !== '');
                        leadData.tags = rowTags;
                    } else {
                        leadData[crmField] = values[0];
                    }
                }

                // Required field validation
                if (!leadData.name) {
                    throw new Error('Name is required');
                }
                if (!leadData.phone) {
                    throw new Error('Phone number is required');
                }

                // Phone Validation & Normalization
                const phoneValidation = phoneUtils.validatePhoneNumber(leadData.phone, mappedCountryCode);
                if (!phoneValidation.isValid) {
                    throw new Error(phoneValidation.reason);
                }
                const normalizedPhone = phoneValidation.normalized;
                leadData.phone = normalizedPhone;

                // Handle global tags
                const finalTags = [...(leadData.tags || [])];
                if (globalTags && Array.isArray(globalTags)) {
                    globalTags.forEach(t => {
                        const tag = String(t).trim().toLowerCase();
                        if (tag && !finalTags.includes(tag)) finalTags.push(tag);
                    });
                }
                leadData.tags = finalTags;



                // Handle Car Details structure
                if (hasCarData) {
                    if (carDetail.intent === 'buying' || carDetail.intent === 'exchange') {
                        if (Object.keys(carDetail.wantedCar).length === 0) {
                            carDetail.wantedCar = { brandName: carDetail.brandName, modelName: carDetail.modelName, fuelType: carDetail.fuelType, kmDriven: carDetail.kmDriven };
                        }
                    }
                    if (carDetail.intent === 'selling' || carDetail.intent === 'exchange') {
                        if (Object.keys(carDetail.ownedCar).length === 0) {
                            carDetail.ownedCar = { brandName: carDetail.brandName, modelName: carDetail.modelName, fuelType: carDetail.fuelType, kmDriven: carDetail.kmDriven };
                        }
                    }
                    leadData.carDetails = [carDetail];
                }

                // Check for existing lead
                const existingLead = await Lead.findOne({ phone: normalizedPhone });
                let importStatus = 'created';

                if (existingLead) {
                    importStatus = 'updated';
                    // Merge Car Details
                    if (hasCarData) {
                        const isDuplicateCar = existingLead.carDetails.some(existing => 
                            existing.intent === carDetail.intent &&
                            (existing.wantedCar?.brandName || '') === (carDetail.wantedCar?.brandName || '') &&
                            (existing.wantedCar?.modelName || '') === (carDetail.wantedCar?.modelName || '') &&
                            (existing.ownedCar?.brandName || '') === (carDetail.ownedCar?.brandName || '') &&
                            (existing.ownedCar?.modelName || '') === (carDetail.ownedCar?.modelName || '')
                        );
                        if (!isDuplicateCar) {
                            existingLead.carDetails.push(carDetail);
                        }
                    }

                    // Merge Notes
                    if (leadData.notes && leadData.notes.length > 0) {
                        leadData.notes.forEach(noteToAdd => {
                            if (!existingLead.notes.includes(noteToAdd)) {
                                existingLead.notes.push(noteToAdd);
                            }
                        });
                    }

                    // Merge Tags
                    if (leadData.tags && leadData.tags.length > 0) {
                        const tagIds = await resolveTags(leadData.tags);
                        tagIds.forEach(id => {
                            if (!existingLead.tags.some(existingId => String(existingId) === String(id))) {
                                existingLead.tags.push(id);
                            }
                        });
                        existingLead.markModified('tags');
                    }

                    // Update other fields if empty
                    ['name', 'place', 'designation', 'leadOrigin', 'referredBy'].forEach(field => {
                        if (!existingLead[field] && leadData[field]) {
                            existingLead[field] = leadData[field];
                        }
                    });

                    await existingLead.save();
                    results.updated++;
                } else {
                    if (leadData.tags && leadData.tags.length > 0) {
                        leadData.tags = await resolveTags(leadData.tags);
                    }
                    const newLead = new Lead(leadData);
                    await newLead.save();
                    results.created++;
                }

                results.completedRows.push({
                    ...row,
                    _importStatus: importStatus
                });

            } catch (err) {
                results.errors.push({ row: i + 1, message: err.message });
                results.failedRows.push({
                    ...row,
                    _errorReason: err.message
                });
                results.skipped++;
            }
        }

        res.json({ message: 'Import complete', results });
    } catch (error) { next(error); }
};

export const getLeads = async (req, res, next) => {
    try {
        const leads = await Lead.find()
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username')
            .populate('tags')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) { next(error); }
};

export const getLeadById = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'username')
            .populate('assignmentHistory.userId', 'username')
            .populate('tags');
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
        if (req.body.tags) {
            req.body.tags = await resolveTags(req.body.tags);
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
            .populate('assignmentHistory.userId', 'username')
            .populate('tags');

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
        
        if (addTags && addTags.length > 0) {
            const tagIds = await resolveTags(addTags);
            mongoUpdate.$addToSet = { tags: { $each: tagIds } };
        }
        
        if (removeTags && removeTags.length > 0) {
            const tagIds = await resolveTags(removeTags);
            mongoUpdate.$pull = { tags: { $in: tagIds } };
        }

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
        const apiLeads = await ApiLead.find()
            .populate('tags')
            .sort({ createdAt: -1 });
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
        if (updates.tags) {
            updates.tags = await resolveTags(updates.tags);
        }
        const updatedLead = await ApiLead.findByIdAndUpdate(leadId, updates, { new: true }).populate('tags');
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

        const fullPhone = (stagedLead.countryCode || '') + stagedLead.phone;
        const existingInCRM = await Lead.findOne({ phone: fullPhone.trim() });

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
                .populate('assignmentHistory.userId', 'username')
                .populate('tags');
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
