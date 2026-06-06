import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import ApiLead from '../models/ApiLead.js';
import Tag from '../models/Tag.js';
import * as phoneUtils from '../utils/phoneUtils.js';
import { findBestMatch } from '../utils/mappingUtils.js';


const resolveTags = async (tagNames) => {
    if (!tagNames || tagNames.length === 0) return [];
    const resolvedTags = [];
    for (const item of tagNames) {
        if (!item) continue;
        
        // If it's already an ObjectId (or looks like one), keep it
        if (mongoose.Types.ObjectId.isValid(item) && typeof item !== 'string') {
            resolvedTags.push(item);
            continue;
        }

        // If it's a string that looks like an ObjectId, it's also probably resolved
        if (typeof item === 'string' && item.length === 24 && mongoose.Types.ObjectId.isValid(item)) {
            resolvedTags.push(item);
            continue;
        }

        if (typeof item !== 'string') continue;
        
        const normalized = item.trim().toLowerCase();
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

        const uniqueTagNames = new Set();
        const globalTagNames = (globalTags || []).map(t => String(t).trim().toLowerCase()).filter(Boolean);
        globalTagNames.forEach(t => uniqueTagNames.add(t));

        const parsedLeads = [];

        // Phase 1: Parse and validate rows in memory without database network overhead
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

                // Map fields from sheets
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

                // Combine local tags and global tags
                const finalTags = [...(leadData.tags || [])];
                globalTagNames.forEach(t => {
                    if (!finalTags.includes(t)) finalTags.push(t);
                });
                leadData.tags = finalTags;
                finalTags.forEach(t => uniqueTagNames.add(t));

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
                } else {
                    leadData.carDetails = [];
                }

                parsedLeads.push({
                    row,
                    leadData,
                    hasCarData,
                    carDetail
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

        // Phase 2: Bulk create/resolve all tags in parallel (exactly 1 batch call)
        const tagNamesArray = [...uniqueTagNames];
        const tagMap = {};
        if (tagNamesArray.length > 0) {
            const tagPromises = tagNamesArray.map(async (name) => {
                const tag = await Tag.findOneAndUpdate(
                    { name },
                    { $setOnInsert: { name } },
                    { upsert: true, new: true }
                );
                return { name, _id: tag._id };
            });
            const resolvedTags = await Promise.all(tagPromises);
            resolvedTags.forEach(t => {
                tagMap[t.name] = t._id;
            });
        }

        // Apply Tag IDs back to leadData in parsed rows
        parsedLeads.forEach(parsed => {
            if (parsed.leadData.tags && parsed.leadData.tags.length > 0) {
                parsed.leadData.tags = parsed.leadData.tags.map(name => tagMap[name]).filter(Boolean);
            }
        });

        // Phase 3: Fetch all existing leads matching any phone number in bulk (exactly 1 B-tree search call)
        const phoneNumbers = parsedLeads.map(p => p.leadData.phone);
        const existingLeads = await Lead.find({ phone: { $in: phoneNumbers } });
        const existingLeadsMap = existingLeads.reduce((acc, lead) => {
            acc[lead.phone] = lead;
            return acc;
        }, {});

        // Phase 4: Construct Mongoose bulk operations
        const bulkOps = [];
        for (const parsed of parsedLeads) {
            const { row, leadData, hasCarData, carDetail } = parsed;
            const existing = existingLeadsMap[leadData.phone];
            let importStatus = 'created';

            if (existing) {
                importStatus = 'updated';
                // Merge Car Details
                if (hasCarData) {
                    const isDuplicateCar = existing.carDetails.some(e => 
                        e.intent === carDetail.intent &&
                        (e.wantedCar?.brandName || '') === (carDetail.wantedCar?.brandName || '') &&
                        (e.wantedCar?.modelName || '') === (carDetail.wantedCar?.modelName || '') &&
                        (e.ownedCar?.brandName || '') === (carDetail.ownedCar?.brandName || '') &&
                        (e.ownedCar?.modelName || '') === (carDetail.ownedCar?.modelName || '')
                    );
                    if (!isDuplicateCar) {
                        existing.carDetails.push(carDetail);
                    }
                }

                // Merge Notes
                if (leadData.notes && leadData.notes.length > 0) {
                    leadData.notes.forEach(note => {
                        if (!existing.notes.includes(note)) {
                            existing.notes.push(note);
                        }
                    });
                }

                // Merge Tags
                if (leadData.tags && leadData.tags.length > 0) {
                    leadData.tags.forEach(id => {
                        if (!existing.tags.some(existingId => String(existingId) === String(id))) {
                            existing.tags.push(id);
                        }
                    });
                }

                // Update empty fields in memory
                const updateFields = {};
                ['name', 'place', 'designation', 'leadOrigin', 'referredBy'].forEach(field => {
                    if (!existing[field] && leadData[field]) {
                        existing[field] = leadData[field];
                    }
                    updateFields[field] = existing[field];
                });

                bulkOps.push({
                    updateOne: {
                        filter: { _id: existing._id },
                        update: {
                            $set: {
                                carDetails: existing.carDetails,
                                notes: existing.notes,
                                tags: existing.tags,
                                ...updateFields
                            }
                        }
                    }
                });
                results.updated++;
            } else {
                bulkOps.push({
                    insertOne: {
                        document: leadData
                    }
                });
                results.created++;
            }

            results.completedRows.push({
                ...row,
                _importStatus: importStatus
            });
        }

        // Execute all updates and inserts in exactly one DB roundtrip!
        if (bulkOps.length > 0) {
            await Lead.bulkWrite(bulkOps, { ordered: false });
        }

        res.json({ message: 'Import complete', results });
    } catch (error) { next(error); }
};

let hasCleanedUp = false;

export const getLeads = async (req, res, next) => {
    try {
        // One-time cleanup of any malformed tag data (strings instead of ObjectIds)
        if (!hasCleanedUp) {
            console.log('Running one-time tag cleanup...');
            const leadsWithStrings = await Lead.find({ tags: { $elemMatch: { $type: 'string' } } });
            if (leadsWithStrings.length > 0) {
                console.log(`Found ${leadsWithStrings.length} leads with malformed tags. Fixing...`);
                for (const lead of leadsWithStrings) {
                    lead.tags = await resolveTags(lead.tags);
                    await lead.save();
                }
            }
            hasCleanedUp = true;
        }

        const {
            limit,
            page,
            search,
            status,
            leadType,
            assignedTo,
            leadOrigin,
            paymentStatus,
            bookMethod,
            hasFollowup,
            name,
            phone,
            place,
            designation,
            countryCode,
            brand,
            brandName,
            model,
            modelName,
            fuelType,
            year,
            tags,
            tag,
            kmDriven,
            kmDrivenValue,
            kmDrivenOp,
            amount,
            amountValue,
            amountOp,
            date,
            followupDate,
            followupCompletedDate,
            followupNotRespondedDate,
            followupMissedDate
        } = req.query;

        // Build matching query
        const queryObj = {};

        // Search name, phone, place or tag
        if (search) {
            const searchRegex = new RegExp(search.trim(), 'i');
            const searchDigits = search.replace(/\D/g, '');
            const orConditions = [
                { name: searchRegex },
                { phone: searchRegex },
                { place: searchRegex }
            ];
            if (searchDigits) {
                orConditions.push({ phone: new RegExp(searchDigits) });
            }
            queryObj.$or = orConditions;
        }

        // Exact & regex matches
        if (status && status !== 'all') {
            queryObj.status = status;
        }
        if (leadType && leadType !== 'all') {
            queryObj.leadType = leadType;
        }
        if (assignedTo && assignedTo !== 'all') {
            if (assignedTo === 'unassigned') {
                queryObj.assignedTo = { $exists: false };
            } else {
                queryObj.assignedTo = assignedTo;
            }
        }
        if (leadOrigin && leadOrigin !== 'all') {
            queryObj.leadOrigin = leadOrigin;
        }
        if (paymentStatus && paymentStatus !== 'all') {
            queryObj.paymentStatus = paymentStatus;
        }
        if (bookMethod && bookMethod !== 'all') {
            queryObj.bookMethod = bookMethod;
        }

        // Followups filter
        if (hasFollowup === 'true') {
            queryObj.followupDate = { $exists: true, $ne: null };
            queryObj.status = { $nin: ['booking_confirmed', 'deal_closed'] };
        }

        // Ad-hoc Filters
        if (name) {
            queryObj.name = new RegExp(name.trim(), 'i');
        }
        if (place) {
            queryObj.place = new RegExp(place.trim(), 'i');
        }
        if (designation) {
            queryObj.designation = new RegExp(designation.trim(), 'i');
        }

        // Country code and phone filters
        if (countryCode) {
            if (countryCode === 'none') {
                queryObj.phone = { $not: /^\+/ };
            } else {
                queryObj.phone = new RegExp('^\\' + countryCode);
            }
        }
        if (phone) {
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits) {
                queryObj.phone = new RegExp(phoneDigits);
            } else {
                queryObj.phone = new RegExp(phone.trim(), 'i');
            }
        }

        // Car Details Filters (Brand, Model, Fuel, Year)
        const activeBrand = brand || brandName;
        const activeModel = model || modelName;
        const activeFuelType = fuelType;
        const activeYear = year;

        if (activeBrand || activeModel || (activeFuelType && activeFuelType !== 'all') || activeYear) {
            const orCarConditions = [];
            
            if (activeBrand) {
                const brandRegex = new RegExp(activeBrand.trim(), 'i');
                orCarConditions.push(
                    { 'carDetails.brandName': brandRegex },
                    { 'carDetails.wantedCar.brandName': brandRegex },
                    { 'carDetails.ownedCar.brandName': brandRegex }
                );
            }
            if (activeModel) {
                const modelRegex = new RegExp(activeModel.trim(), 'i');
                orCarConditions.push(
                    { 'carDetails.modelName': modelRegex },
                    { 'carDetails.wantedCar.modelName': modelRegex },
                    { 'carDetails.ownedCar.modelName': modelRegex }
                );
            }
            if (activeFuelType && activeFuelType !== 'all') {
                orCarConditions.push(
                    { 'carDetails.fuelType': activeFuelType.toLowerCase() },
                    { 'carDetails.wantedCar.fuelType': activeFuelType.toLowerCase() },
                    { 'carDetails.ownedCar.fuelType': activeFuelType.toLowerCase() }
                );
            }
            if (activeYear) {
                orCarConditions.push(
                    { 'carDetails.wantedCar.year': activeYear },
                    { 'carDetails.ownedCar.year': activeYear }
                );
            }

            if (orCarConditions.length > 0) {
                if (queryObj.$or) {
                    queryObj.$and = queryObj.$and || [];
                    queryObj.$and.push({ $or: orCarConditions });
                } else {
                    queryObj.$or = orCarConditions;
                }
            }
        }

        // Tags matching
        const activeTags = tags || tag;
        if (activeTags) {
            const tagList = Array.isArray(activeTags) ? activeTags : String(activeTags).split(',').map(t => t.trim()).filter(Boolean);
            if (tagList.length > 0) {
                const validIds = tagList.filter(t => mongoose.Types.ObjectId.isValid(t));
                const names = tagList.filter(t => !mongoose.Types.ObjectId.isValid(t));
                let tagIds = [...validIds];
                
                if (names.length > 0) {
                    const foundTags = await Tag.find({ name: { $in: names.map(n => new RegExp('^' + n + '$', 'i')) } });
                    tagIds = [...tagIds, ...foundTags.map(t => t._id)];
                }
                
                if (tagIds.length > 0) {
                    queryObj.tags = { $in: tagIds };
                }
            }
        }

        // Date matching (Creation Date range check)
        if (date) {
            const start = new Date(date);
            if (!isNaN(start.getTime())) {
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                queryObj.createdAt = {
                    $gte: start,
                    $lt: end
                };
            }
        }

        // Follow-up Date matching (contacts with follow-up scheduled on given date)
        if (followupDate) {
            const start = new Date(followupDate);
            if (!isNaN(start.getTime())) {
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                queryObj.followupDate = {
                    $gte: start,
                    $lt: end
                };
            }
        }

        // Completed follow-ups by date (followupHistory.result = 'responded' on that day)
        if (followupCompletedDate) {
            const start = new Date(followupCompletedDate);
            if (!isNaN(start.getTime())) {
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                queryObj.followupHistory = {
                    $elemMatch: {
                        result: 'responded',
                        scheduledDate: { $gte: start, $lt: end }
                    }
                };
            }
        }

        // Not responded follow-ups by date (followupHistory.result = 'not_responded' on that day)
        if (followupNotRespondedDate) {
            const start = new Date(followupNotRespondedDate);
            if (!isNaN(start.getTime())) {
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                queryObj.followupHistory = {
                    $elemMatch: {
                        result: 'not_responded',
                        scheduledDate: { $gte: start, $lt: end }
                    }
                };
            }
        }

        // Missed follow-ups by date (followupHistory.wasMissed = true on that day)
        if (followupMissedDate) {
            const start = new Date(followupMissedDate);
            if (!isNaN(start.getTime())) {
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                queryObj.followupHistory = {
                    $elemMatch: {
                        wasMissed: true,
                        scheduledDate: { $gte: start, $lt: end }
                    }
                };
            }
        }

        // Numeric fields converter function helper
        const convertToDouble = (expr) => ({
            $convert: {
                input: expr,
                to: "double",
                onError: 0,
                onNull: 0
            }
        });

        // KM Driven matching
        const activeKmDriven = kmDriven || kmDrivenValue;
        if (activeKmDriven) {
            const num = parseFloat(activeKmDriven);
            if (!isNaN(num)) {
                const op = kmDrivenOp === 'gt' ? '$gt' : (kmDrivenOp === 'lt' ? '$lt' : '$eq');
                
                const kmExpr = {
                    $anyElementTrue: {
                        $map: {
                            input: "$carDetails",
                            as: "car",
                            in: {
                                $or: [
                                    {
                                        [op]: [
                                            convertToDouble("$$car.kmDriven"),
                                            num
                                        ]
                                    },
                                    {
                                        [op]: [
                                            convertToDouble("$$car.wantedCar.kmDriven"),
                                            num
                                        ]
                                    },
                                    {
                                        [op]: [
                                            convertToDouble("$$car.ownedCar.kmDriven"),
                                            num
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                };

                queryObj.$expr = queryObj.$expr ? { $and: [queryObj.$expr, kmExpr] } : kmExpr;
            }
        }

        // Budget matching
        const activeAmount = amount || amountValue;
        if (activeAmount) {
            const num = parseFloat(activeAmount);
            if (!isNaN(num)) {
                const op = amountOp === 'gt' ? '$gt' : (amountOp === 'lt' ? '$lt' : '$eq');
                
                const amountExpr = {
                    $anyElementTrue: {
                        $map: {
                            input: "$carDetails",
                            as: "car",
                            in: {
                                $or: [
                                    {
                                        [op]: [
                                            convertToDouble("$$car.amount"),
                                            num
                                        ]
                                    },
                                    {
                                        [op]: [
                                            convertToDouble("$$car.wantedCar.amount"),
                                            num
                                        ]
                                    },
                                    {
                                        [op]: [
                                            convertToDouble("$$car.ownedCar.amount"),
                                            num
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                };

                queryObj.$expr = queryObj.$expr ? { $and: [queryObj.$expr, amountExpr] } : amountExpr;
            }
        }

        // Check if pagination is requested
        if (limit && limit !== 'all') {
            const parsedLimit = parseInt(limit);
            const parsedPage = parseInt(page) || 0;
            const skip = parsedPage * parsedLimit;

            const [leads, total] = await Promise.all([
                Lead.find(queryObj)
                    .select('-assignmentHistory -followupHistory -notes -followupNote')
                    .populate('assignedTo', 'username')
                    .populate('tags')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parsedLimit)
                    .lean(),
                Lead.countDocuments(queryObj)
            ]);

            return res.json({
                leads,
                total,
                pages: Math.ceil(total / parsedLimit),
                currentPage: parsedPage
            });
        }

        // No pagination: return raw array (for backwards compatibility if requested)
        const leads = await Lead.find(queryObj)
            .select('-assignmentHistory -followupHistory -notes -followupNote')
            .populate('assignedTo', 'username')
            .populate('tags')
            .sort({ createdAt: -1 })
            .lean();

        res.json(leads);
    } catch (error) { next(error); }
};

export const getLeadsStats = async (req, res, next) => {
    try {
        const { search, assignedTo } = req.query;
        const searchRegex = search ? new RegExp(search.trim(), 'i') : null;
        const matchQuery = searchRegex ? { $or: [{ name: searchRegex }, { phone: searchRegex }] } : {};
        if (assignedTo && assignedTo !== 'all') {
            if (assignedTo === 'unassigned') {
                matchQuery.assignedTo = { $exists: false };
            } else {
                matchQuery.assignedTo = mongoose.Types.ObjectId.isValid(assignedTo)
                    ? new mongoose.Types.ObjectId(assignedTo)
                    : assignedTo;
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch aggregation metrics and user performance stats simultaneously!
        const [counts, followupStats, originBreakdown, statusBreakdown, userPerformanceAggregation] = await Promise.all([
            Lead.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        hot: { $sum: { $cond: [{ $eq: ["$leadType", "hot"] }, 1, 0] } },
                        warm: { $sum: { $cond: [{ $eq: ["$leadType", "warm"] }, 1, 0] } },
                        cold: { $sum: { $cond: [{ $eq: ["$leadType", "cold"] }, 1, 0] } },
                        total: { $sum: 1 },
                        unassigned: { $sum: { $cond: [{ $not: ["$assignedTo"] }, 1, 0] } },
                        advancePayment: { $sum: { $cond: [{ $eq: ["$paymentStatus", "advance payment"] }, 1, 0] } }
                    }
                }
            ]),
            Lead.aggregate([
                {
                    $match: {
                        ...matchQuery,
                        followupDate: { $exists: true, $ne: null },
                        status: { $nin: ['booking_confirmed', 'deal_closed'] }
                    }
                },
                {
                    $project: {
                        isTodayPending: {
                            $and: [
                                { $gte: ["$followupDate", today] },
                                { $lt: ["$followupDate", tomorrow] }
                            ]
                        },
                        isPastMissed: { $lt: ["$followupDate", today] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        todayPending: { $sum: { $cond: ["$isTodayPending", 1, 0] } },
                        pastMissed: { $sum: { $cond: ["$isPastMissed", 1, 0] } }
                    }
                }
            ]),
            Lead.aggregate([
                { $match: matchQuery },
                { $group: { _id: { $toLower: { $ifNull: ["$leadOrigin", "other"] } }, count: { $sum: 1 } } },
                { $project: { origin: "$_id", count: 1, _id: 0 } }
            ]),
            Lead.aggregate([
                { $match: matchQuery },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { status: "$_id", count: 1, _id: 0 } }
            ]),
            Lead.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: "$assignedTo",
                        totalAssigned: { $sum: 1 },
                        todayPending: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ifNull: ["$followupDate", false] },
                                            { $gte: ["$followupDate", today] },
                                            { $lt: ["$followupDate", tomorrow] },
                                            { $ne: ["$status", "booking_confirmed"] },
                                            { $ne: ["$status", "deal_closed"] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        pastMissed: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ifNull: ["$followupDate", false] },
                                            { $lt: ["$followupDate", today] },
                                            { $ne: ["$status", "booking_confirmed"] },
                                            { $ne: ["$status", "deal_closed"] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ])
        ]);

        // Apply the 6 PM rule: after 6 PM, today's pending followups are classified as missed
        const now = new Date();
        const isAfter6PM = now.getHours() >= 18;

        const rawFollowupStats = followupStats[0] || { todayPending: 0, pastMissed: 0 };
        const adjustedTodayFollowups = isAfter6PM ? 0 : rawFollowupStats.todayPending;
        const adjustedMissedFollowups = rawFollowupStats.pastMissed + (isAfter6PM ? rawFollowupStats.todayPending : 0);

        // Map aggregated performance onto user identities safely
        const User = mongoose.model('User');
        const allUsers = await User.find({}, 'username role').lean();
        const performanceMap = {};
        userPerformanceAggregation.forEach(p => {
            if (p._id) {
                performanceMap[String(p._id)] = p;
            }
        });

        const userPerformance = allUsers.map(u => {
            const p = performanceMap[String(u._id)] || { totalAssigned: 0, todayPending: 0, pastMissed: 0 };
            return {
                _id: u._id,
                username: u.username,
                role: u.role,
                totalAssigned: p.totalAssigned,
                todayFollowups: isAfter6PM ? 0 : (p.todayPending || 0),
                missedFollowups: (p.pastMissed || 0) + (isAfter6PM ? (p.todayPending || 0) : 0)
            };
        });

        const stats = {
            ...(counts[0] || { hot: 0, warm: 0, cold: 0, total: 0, unassigned: 0, advancePayment: 0 }),
            todayFollowups: adjustedTodayFollowups,
            missedFollowups: adjustedMissedFollowups,
            originBreakdown: originBreakdown.reduce((acc, curr) => ({ ...acc, [curr.origin]: curr.count }), {}),
            statusBreakdown: statusBreakdown.reduce((acc, curr) => ({ ...acc, [curr.status]: curr.count }), {}),
            userPerformance
        };

        res.json(stats);
    } catch (error) { next(error); }
};

export const getWorkingReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ message: 'Date query parameter is required' });

        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = selectedDate.getTime() === today.getTime();
        const now = new Date();
        const isAfter6PM = now.getHours() >= 18;

        const User = mongoose.model('User');
        const allUsers = await User.find({}, 'username role').lean();

        // 1. Calculate Cumulative Historical performance (scheduled BEFORE today)
        const [historicalHistory, historicalPending, dailyHistory, dailyPending, upcomingLeads] = await Promise.all([
            Lead.aggregate([
                { $unwind: "$followupHistory" },
                { 
                    $match: { 
                        "followupHistory.scheduledDate": { $lt: today } 
                    } 
                },
                {
                    $group: {
                        _id: "$followupHistory.userId",
                        completed: {
                            $sum: { $cond: [{ $eq: ["$followupHistory.result", "responded"] }, 1, 0] }
                        },
                        noResponse: {
                            $sum: { $cond: [{ $eq: ["$followupHistory.result", "not_responded"] }, 1, 0] }
                        }
                    }
                }
            ]),
            Lead.aggregate([
                {
                    $match: {
                        followupDate: { $lt: today },
                        status: { $nin: ['booking_confirmed', 'deal_closed'] }
                    }
                },
                {
                    $group: {
                        _id: "$assignedTo",
                        missed: { $sum: 1 }
                    }
                }
            ]),
            // 2. Calculate Daily Performance Data
            Lead.aggregate([
                { $unwind: "$followupHistory" },
                {
                    $match: {
                        "followupHistory.scheduledDate": { $gte: selectedDate, $lt: nextDay }
                    }
                },
                {
                    $group: {
                        _id: "$followupHistory.userId",
                        completed: {
                            $sum: { $cond: [{ $eq: ["$followupHistory.result", "responded"] }, 1, 0] }
                        },
                        noResponse: {
                            $sum: { $cond: [{ $eq: ["$followupHistory.result", "not_responded"] }, 1, 0] }
                        }
                    }
                }
            ]),
            Lead.aggregate([
                {
                    $match: {
                        followupDate: { $gte: selectedDate, $lt: nextDay },
                        status: { $nin: ['booking_confirmed', 'deal_closed'] }
                    }
                },
                {
                    $group: {
                        _id: "$assignedTo",
                        pendingCount: { $sum: 1 }
                    }
                }
            ]),
            Lead.aggregate([
                {
                    $match: {
                        followupDate: { $gte: tomorrow },
                        status: { $nin: ['booking_confirmed', 'deal_closed'] }
                    }
                },
                {
                    $group: {
                        _id: "$assignedTo",
                        upcomingCount: { $sum: 1 }
                    }
                }
            ])
        ]);

        const histHistoryMap = historicalHistory.reduce((acc, curr) => {
            if (curr._id) acc[String(curr._id)] = curr;
            return acc;
        }, {});
        const histPendingMap = historicalPending.reduce((acc, curr) => {
            if (curr._id) acc[String(curr._id)] = curr;
            return acc;
        }, {});
        const dailyHistoryMap = dailyHistory.reduce((acc, curr) => {
            if (curr._id) acc[String(curr._id)] = curr;
            return acc;
        }, {});
        const dailyPendingMap = dailyPending.reduce((acc, curr) => {
            if (curr._id) acc[String(curr._id)] = curr;
            return acc;
        }, {});
        const upcomingMap = upcomingLeads.reduce((acc, curr) => {
            if (curr._id) acc[String(curr._id)] = curr;
            return acc;
        }, {});

        const cumulativeData = allUsers.map(user => {
            const uid = String(user._id);
            const histH = histHistoryMap[uid] || { completed: 0, noResponse: 0 };
            const histP = histPendingMap[uid] || { missed: 0 };

            const completed = histH.completed;
            const noResponse = histH.noResponse;
            const missed = histP.missed || 0;
            const total = completed + noResponse + missed;

            return {
                _id: user._id,
                username: user.username,
                role: user.role,
                total,
                completed,
                noResponse,
                missed
            };
        });

        const dailyData = allUsers.map(user => {
            const uid = String(user._id);
            const dailyH = dailyHistoryMap[uid] || { completed: 0, noResponse: 0 };
            const dailyP = dailyPendingMap[uid] || { pendingCount: 0 };
            const upcoming = upcomingMap[uid]?.upcomingCount || 0;

            const completed = dailyH.completed;
            const noResponse = dailyH.noResponse;
            const pending = dailyP.pendingCount || 0;

            // Missed logic: Report finalized at 6 PM
            const missed = (selectedDate < today || (isToday && isAfter6PM)) ? pending : 0;
            const scheduled = completed + noResponse + pending;

            return {
                _id: user._id,
                username: user.username,
                role: user.role,
                scheduled,
                completed,
                noResponse,
                missed,
                upcoming,
                isFinalized: !isToday || isAfter6PM
            };
        });

        res.json({ cumulativeData, dailyData });
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

        if (updates.tags) {
            updates.tags = await resolveTags(updates.tags);
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
            .sort({ createdAt: -1 })
            .lean();
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
