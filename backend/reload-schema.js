import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function reloadSchema() {
    try {
        console.log('Connecting to database...');
        await client.connect();

        console.log('Sending schema reload notification...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log('✅ Schema Cache Reload Triggered!');
        console.log('The Supabase API should now recognize the "date" column.');

    } catch (err) {
        console.error('❌ Failed to reload schema:', err);
    } finally {
        await client.end();
    }
}

reloadSchema();
