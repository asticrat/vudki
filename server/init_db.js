require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'asticrat',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'house_split',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

(async () => {
    try {
        await pool.query(schema);
        console.log("Schema applied successfully.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
