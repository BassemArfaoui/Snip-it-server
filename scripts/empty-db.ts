import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function emptyDb() {
    const client = new Client({
        host: process.env.DB_host,
        port: Number(process.env.DB_port),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
    });

    try {
        await client.connect();
        console.log('Connected to database...');

        const res = await client.query(
            "SELECT tablename FROM pg_tables WHERE schemaname='public'"
        );

        for (const row of res.rows) {
            const tableName = row.tablename;
            console.log(`Truncating table ${tableName}...`);
            await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
        }

        console.log('Database emptied successfully.');
    } catch (error) {
        console.error('Error emptying database:', error);
    } finally {
        await client.end();
    }
}

emptyDb();
