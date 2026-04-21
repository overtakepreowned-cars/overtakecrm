import express from 'express';
import * as authController from '../controllers/authController.js';
import * as leadsController from '../controllers/leadsController.js';
import * as usersController from '../controllers/usersController.js';
import * as metadataController from '../controllers/metadataController.js';
import * as webhookController from '../controllers/webhookController.js';

const router = express.Router();

// Auth
router.post('/auth/login', authController.login);

// Users
router.get('/users', usersController.getUsers);
router.post('/users', usersController.createUser);
router.put('/users/:id', usersController.updateUser);
router.delete('/users/:id', usersController.deleteUser);

// Tags
router.get('/tags', metadataController.getTags);
router.post('/tags', metadataController.createTag);
router.delete('/tags/:id', metadataController.deleteTag);

// Smart Lists
router.get('/smartlists', metadataController.getSmartLists);
router.post('/smartlists', metadataController.createSmartList);
router.delete('/smartlists/:id', metadataController.deleteSmartList);

// Leads
router.get('/leads', leadsController.getLeads);
router.get('/leads/:id', leadsController.getLeadById);
router.post('/leads', leadsController.createLead);
router.put('/leads/:id', leadsController.updateLead);
router.delete('/leads/:id', leadsController.deleteLead);

// Bulk Actions
router.post('/leads/bulk-delete', leadsController.bulkDeleteLeads);
router.post('/leads/bulk-assign', leadsController.bulkAssignLeads);
router.post('/leads/bulk-update', leadsController.bulkUpdateLeads);
router.post('/leads/bulk-prefix', leadsController.bulkUpdatePhonePrefix);

// API Leads
router.get('/api-leads', leadsController.getApiLeads);
router.put('/api-leads/:id', leadsController.updateApiLead);
router.delete('/api-leads/:id', leadsController.deleteApiLead);
router.post('/api-leads/:id/approve', leadsController.approveApiLead);

// Webhooks
router.post('/webhooks/leads', webhookController.captureWebhookLead);

export default router;
