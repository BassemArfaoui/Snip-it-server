import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';


// message lel team : u can create jwt tokens to test with this script
// run it like this : npx ts-node scripts/simulation/create_jwt_token.ts <userId>


dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const secret = process.env.JWT_SECRET;

if (!secret) {
    console.error('Error: JWT_SECRET Not Found');
    process.exit(1);
}


const userId = process.argv[2] || '1';
const username = process.argv[3] || 'testuser';
const email = process.argv[4] || 'test@example.com';

const payload = {
    userId: userId,
    username: username,
    email: email,
};

try {
    const token = jwt.sign(payload, secret, { expiresIn: '8h' });
    console.log('Generated JWT Token:');
    console.log(token);
    console.log('\nPayload:', payload);
} catch (error) {
    console.error('Error signing token:', error);
}
