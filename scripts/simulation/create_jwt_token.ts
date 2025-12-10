import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';


//message lel team : u can create jwt tokens to test with this script

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const secret = process.env.JWT_SECRET;

if (!secret) {
    console.error('Error: JWT_SECRET Not Found');
    process.exit(1);
}


const userId = process.argv[2] || '1';

const payload = {
    userId: userId,
};

try {
    const token = jwt.sign(payload, secret, { expiresIn: '8h' });
    console.log('Generated JWT Token:');
    console.log(token);
    console.log('\nPayload:', payload);
} catch (error) {
    console.error('Error signing token:', error);
}
