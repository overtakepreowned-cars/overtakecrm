import User from '../models/User.js';

export const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        let targetRole = '';
        
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
            return res.json({
                _id: 'common-sales-rep',
                username: 'Sales Team',
                role: 'sales'
            });
        }
    } catch (error) { next(error); }
};
