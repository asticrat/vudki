const pool = require('./db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Add gender column
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male'");
        console.log('Added gender column');

        // 2. Update Paths for Male Avatars
        // Only update if not already prefixed
        await pool.query("UPDATE users SET avatar = 'male/' || avatar WHERE avatar IN ('avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar5.png', 'avatar6.png')");

        // 3. Update Paths for Female Avatars
        await pool.query("UPDATE users SET avatar = 'female/' || avatar WHERE avatar = 'avatar4.png'");

        // 4. Set Gender based on Avatar (Backfill)
        await pool.query("UPDATE users SET gender = 'female' WHERE avatar LIKE 'female/%'");
        await pool.query("UPDATE users SET gender = 'male' WHERE avatar LIKE 'male/%'");

        console.log('Migration complete');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}
migrate();
