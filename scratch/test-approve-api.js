import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const token = jwt.sign(
    { id: 'admin123', username: 'admin@overtake', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
);

async function testApprove() {
    const res = await fetch('http://localhost:5001/api/api-leads/6a38f81efb29e359b2965a03/approve', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
}

testApprove().catch(console.error);
