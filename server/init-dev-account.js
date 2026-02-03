const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: false
});

async function initDevAccount() {
    try {
        console.log('🔧 Initializing developer account...\n');

        // 1. Check if "vudki" household exists
        const houseCheck = await pool.query(
            'SELECT id FROM households WHERE name = $1',
            ['vudki']
        );

        let householdId;

        if (houseCheck.rows.length === 0) {
            // Create special "vudki" household
            const houseRes = await pool.query(
                'INSERT INTO households (name) VALUES ($1) RETURNING id',
                ['vudki']
            );
            householdId = houseRes.rows[0].id;
            console.log('✅ Created special household: vudki (ID: ' + householdId + ')');
        } else {
            householdId = houseCheck.rows[0].id;
            console.log('ℹ️  Household "vudki" already exists (ID: ' + householdId + ')');
        }

        // 2. Check if dev user exists
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND household_id = $2',
            ['dev', householdId]
        );

        if (userCheck.rows.length === 0) {
            // Create dev user - use 'admin' role temporarily
            const hashedPassword = await bcrypt.hash('Moonfallen008', 10);

            await pool.query(
                'INSERT INTO users (username, nickname, password_hash, role, household_id) VALUES ($1, $2, $3, $4, $5)',
                ['dev', 'Developer', hashedPassword, 'admin', householdId]
            );

            // Update role constraint and set to developer
            await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
            await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'co-admin', 'member', 'developer'))`);
            await pool.query(`UPDATE users SET role = 'developer' WHERE username = 'dev' AND household_id = $1`, [householdId]);

            console.log('✅ Created developer account');
            console.log('   Username: dev.vudki');
            console.log('   Password: Moonfallen008');
            console.log('   Role: developer');
        } else {
            console.log('ℹ️  Developer account already exists');
        }

        console.log('\n✨ Developer account initialization complete!\n');
        console.log('🔐 Login at: dev.vudki with password: Moonfallen008\n');

    } catch (error) {
        console.error('❌ Error initializing dev account:', error);
    } finally {
        await pool.end();
    }
}

initDevAccount();
