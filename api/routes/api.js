import express from 'express';
import * as authController from '../controllers/authController.js';
import * as leadsController from '../controllers/leadsController.js';
import * as usersController from '../controllers/usersController.js';
import * as metadataController from '../controllers/metadataController.js';
import * as webhookController from '../controllers/webhookController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate, loginValidation, leadValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Auth
router.post('/auth/login', loginValidation, validate, authController.login);

// Webhooks
router.post('/webhooks/leads', webhookController.captureWebhookLead);

// Protected Routes (Authenticate all below)
router.use(authenticate);

// Users (Admin only for modifications)
router.get('/users', usersController.getUsers);
router.post('/users', authorize(['admin']), usersController.createUser);
router.put('/users/:id', authorize(['admin']), usersController.updateUser);
router.delete('/users/:id', authorize(['admin']), usersController.deleteUser);

// Tags
router.get('/tags', metadataController.getTags);
router.post('/tags', metadataController.createTag);
router.put('/tags/:id', metadataController.updateTag);
router.delete('/tags/:id', metadataController.deleteTag);

// Smart Lists
router.get('/smartlists', metadataController.getSmartLists);
router.post('/smartlists', metadataController.createSmartList);
router.delete('/smartlists/:id', metadataController.deleteSmartList);

// Leads
router.get('/reports/working', leadsController.getWorkingReport);
router.get('/leads/stats', leadsController.getLeadsStats);
router.get('/leads', leadsController.getLeads);
router.get('/leads/:id', leadsController.getLeadById);
router.post('/leads', leadValidation, validate, leadsController.createLead);
router.put('/leads/:id', leadsController.updateLead);
router.delete('/leads/:id', authorize(['admin']), leadsController.deleteLead);
router.post('/leads/import', authorize(['admin']), leadsController.importLeads);

// Bulk Actions
router.post('/leads/bulk-delete', authorize(['admin']), leadsController.bulkDeleteLeads);
router.post('/leads/bulk-assign', leadsController.bulkAssignLeads);
router.post('/leads/bulk-update', leadsController.bulkUpdateLeads);
router.post('/leads/bulk-prefix', leadsController.bulkUpdatePhonePrefix);

// API Leads
router.get('/api-leads', authorize(['admin', 'sales']), leadsController.getApiLeads);
router.put('/api-leads/:id', authorize(['admin']), leadsController.updateApiLead);
router.delete('/api-leads/:id', authorize(['admin']), leadsController.deleteApiLead);
router.post('/api-leads/:id/approve', authorize(['admin']), leadsController.approveApiLead);

export default router;
