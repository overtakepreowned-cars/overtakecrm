import Tag from '../models/Tag.js';
import SmartList from '../models/SmartList.js';

export const getTags = async (req, res, next) => {
    try {
        const tags = await Tag.find().sort({ createdAt: -1 });
        res.json(tags);
    } catch (error) { next(error); }
};

export const createTag = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Tag name is required' });
        
        const normalized = name.trim().toLowerCase();
        const existing = await Tag.findOne({ name: normalized });
        if (existing) return res.status(400).json({ message: 'Tag already exists' });
        
        const tag = new Tag({ name: normalized });
        await tag.save();
        res.status(201).json(tag);
    } catch (error) { next(error); }
};

export const updateTag = async (req, res, next) => {
    try {
        const tag = await Tag.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(tag);
    } catch (error) { next(error); }
};

export const deleteTag = async (req, res, next) => {
    try {
        const tagId = req.params.id;
        
        // Delete the tag
        await Tag.findByIdAndDelete(tagId);
        
        // Remove this tag from all leads
        const Lead = (await import('../models/Lead.js')).default;
        const ApiLead = (await import('../models/ApiLead.js')).default;
        
        await Lead.updateMany(
            { tags: tagId },
            { $pull: { tags: tagId } }
        );
        await ApiLead.updateMany(
            { tags: tagId },
            { $pull: { tags: tagId } }
        );
        
        res.json({ message: 'Deleted successfully and removed from all leads' });
    } catch (error) { next(error); }
};

export const getSmartLists = async (req, res, next) => {
    try {
        const lists = await SmartList.find().sort({ createdAt: -1 });
        res.json(lists);
    } catch (error) { next(error); }
};

export const createSmartList = async (req, res, next) => {
    try {
        const list = new SmartList(req.body);
        await list.save();
        res.status(201).json(list);
    } catch (error) { next(error); }
};

export const deleteSmartList = async (req, res, next) => {
    try {
        await SmartList.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) { next(error); }
};
