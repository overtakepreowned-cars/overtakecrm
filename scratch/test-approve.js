import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';
import Lead from '../api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const leadId = '6a386c5a4d575e32ec0be7fe'; // use one of the ids
    const stagedLead = await ApiLead.findById(leadId).lean();
    if (!stagedLead) {
        console.log("No lead found with ID:", leadId);
        process.exit(1);
    }
    
    console.log("Testing approval for stagedLead:", stagedLead.name, stagedLead.phone);
    
    try {
        const fullPhone = (stagedLead.countryCode || '') + stagedLead.phone;
        const existingInCRM = await Lead.findOne({ phone: fullPhone.trim() });
        console.log("Existing in CRM:", !!existingInCRM);

        if (existingInCRM) {
            console.log("Merge path...");
        } else {
            console.log("Create path...");
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
            await newLead.validate();
            console.log("Mongoose validation passed!");
            await newLead.save();
            console.log("Save successful!");
        }
    } catch (err) {
        console.error("ERROR during approval:", err);
    }
    
    process.exit(0);
}
run().catch(console.error);
