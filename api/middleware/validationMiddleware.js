import { body, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').trim().notEmpty().withMessage('Password is required'),
];

export const leadValidation = [
    body('name').trim().notEmpty().withMessage('Name is required').toLowerCase(),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('leadOrigin').optional().trim().toLowerCase(),
    body('status').optional().trim().toLowerCase(),
];
