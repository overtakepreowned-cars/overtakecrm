import jwt from 'jsonwebtoken';

export const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const adminUser = process.env.ADMIN_USERNAME;
        const adminPass = process.env.ADMIN_PASSWORD;
        const salesUser = process.env.SALES_USERNAME;
        const salesPass = process.env.SALES_PASSWORD;

        let role = '';
        let displayName = '';

        if (username === adminUser && password === adminPass) {
            role = 'admin';
            displayName = 'Administrator';
        } else if (username === salesUser && password === salesPass) {
            role = 'sales';
            displayName = 'Sales Team';
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { role, username: displayName },
            process.env.JWT_SECRET || 'fallback-secret-for-dev',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                username: displayName,
                role: role
            }
        });
    } catch (error) { next(error); }
};
