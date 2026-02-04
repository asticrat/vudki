const express = require('express');
const { Jimp } = require('jimp');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve Frontend (Vite Build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle React Routing, return all requests to React app
// Handle React Routing, return all requests to React app
// Using regex syntax (.*) for compatibility with newer Express/path-to-regexp
app.get(/(.*)/, (req, res, next) => {
    // Skip if request is for API
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) return next();
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // { id, username, role, householdId }
        next();
    });
};

// --- AUTH ROUTES ---

// --- Validation Helpers ---
const validateUsername = (username) => {
    if (!username) return "Username is required.";
    const regex = /^(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]{3,30}(?<![_.])$/;
    if (!regex.test(username)) return "Username: 3-30 alphanumeric chars, . or _, no spaces, no consecutive symbols, can't start/end with symbol.";
    const reserved = ['admin', 'root', 'support', 'dev', 'developer'];
    if (reserved.includes(username.toLowerCase())) return "Username is reserved.";
    return null;
};

const validatePassword = (password, username) => {
    if (!password) return "Password is required.";
    if (password.length < 6 || password.length > 24) return "Password must be 6-24 characters long.";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return "Password must include uppercase, lowercase, and number.";
    if (username && password.toLowerCase().includes(username.toLowerCase())) return "Password cannot contain the username.";
    if (/(.)\1{3,}/.test(password)) return "Password cannot contain 4+ repeated characters (e.g. aaaa).";
    // Basic sequence check (e.g. 1234, abcd)
    if (/1234|abcd|qwerty/.test(password.toLowerCase())) return "Password contains common weak sequences.";
    return null;
};

// Register New House (Admin)
app.post('/api/auth/register', async (req, res) => {
    const { username, nickname, password, houseName, address, maxMembers, gender } = req.body;

    // Validate
    const userErr = validateUsername(username);
    if (userErr) return res.status(400).json({ error: userErr });
    const passErr = validatePassword(password, username);
    if (passErr) return res.status(400).json({ error: passErr });

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction to ensure House + Admin are created together
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Create Household
            const houseRes = await client.query(
                'INSERT INTO households (name, address, max_members) VALUES ($1, $2, $3) RETURNING id',
                [houseName.toLowerCase(), address, maxMembers || 6]
            );
            const houseId = houseRes.rows[0].id;

            // 2. Create Admin User
            const maleAvatars = ['male/avatar1.png', 'male/avatar2.png', 'male/avatar3.png', 'male/avatar5.png', 'male/avatar6.png'];
            const femaleAvatars = ['female/avatar4.png'];
            const avatarPool = (gender === 'female') ? femaleAvatars : maleAvatars;
            const randomAvatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];

            await client.query(
                'INSERT INTO users (username, nickname, password_hash, role, household_id, avatar, gender) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [username.toLowerCase(), nickname, hashedPassword, 'admin', houseId, randomAvatar, gender || 'male']
            );

            await client.query('COMMIT');

            res.json({ message: 'Household created successfully. Please login.' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Household name already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Login (Member/Admin)
app.post('/api/auth/login', async (req, res) => {
    const { accountId, password } = req.body; // accountId = "suman.daisy"

    if (!accountId || !accountId.includes('.')) {
        return res.status(400).json({ error: 'Invalid login format. Use username.housename' });
    }

    const [username, houseName] = accountId.split('.');

    try {
        // Find Household
        const houseRes = await pool.query('SELECT id FROM households WHERE name = $1', [houseName.toLowerCase()]);
        if (houseRes.rows.length === 0) return res.status(400).json({ error: 'Household not found' });
        const houseId = houseRes.rows[0].id;

        // Find User
        const userRes = await pool.query('SELECT * FROM users WHERE username = $1 AND household_id = $2', [username.toLowerCase(), houseId]);
        if (userRes.rows.length === 0) return res.status(400).json({ error: 'User not found in this house' });

        const user = userRes.rows[0];

        // Check Password
        if (await bcrypt.compare(password, user.password_hash)) {
            // Generate Token
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role, householdId: user.household_id }, JWT_SECRET);
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    nickname: user.nickname, // Send nickname
                    role: user.role,
                    avatar: user.avatar,
                    houseName: houseName, // Return House Name
                    gender: user.gender || 'male', // Return Gender
                    fullId: `${user.username}.${houseName.toLowerCase()}`
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Create Member (Admin Only)
app.post('/api/members', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { username, nickname, password, gender } = req.body;

    // Validate
    const userErr = validateUsername(username);
    if (userErr) return res.status(400).json({ error: userErr });
    const passErr = validatePassword(password, username);
    if (passErr) return res.status(400).json({ error: passErr });

    try {
        // Check Member Limit
        const countRes = await pool.query('SELECT count(*) FROM users WHERE household_id = $1', [req.user.householdId]);
        const houseRes = await pool.query('SELECT max_members FROM households WHERE id = $1', [req.user.householdId]);

        if (parseInt(countRes.rows[0].count) >= houseRes.rows[0].max_members) {
            return res.status(400).json({ error: 'Household member limit reached.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Get avatars already used in this household
        const usedAvatarsRes = await pool.query(
            'SELECT avatar FROM users WHERE household_id = $1',
            [req.user.householdId]
        );
        const usedAvatars = usedAvatarsRes.rows.map(row => row.avatar);

        // Available avatars based on gender
        const maleAvatars = ['male/avatar1.png', 'male/avatar2.png', 'male/avatar3.png', 'male/avatar5.png', 'male/avatar6.png'];
        const femaleAvatars = ['female/avatar4.png'];
        const targetPool = (gender === 'female') ? femaleAvatars : maleAvatars;

        const availableAvatars = targetPool.filter(a => !usedAvatars.includes(a));

        if (availableAvatars.length === 0) {
            return res.status(400).json({ error: `No available ${gender || 'male'} avatars left in this household.` });
        }

        const randomAvatar = availableAvatars[Math.floor(Math.random() * availableAvatars.length)];

        await pool.query(
            'INSERT INTO users (username, nickname, password_hash, role, household_id, avatar, gender) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [username.toLowerCase(), nickname, hashedPassword, 'member', req.user.householdId, randomAvatar, gender || 'male']
        );

        res.json({ message: 'Member added successfully' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Username already taken in this house.' });
        res.status(500).json({ error: error.message });
    }
});

// Delete Member (Admin Only) with Password check
app.post('/api/members/delete', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { userId, adminPassword } = req.body;

    try {
        // 1. Verify Admin Password
        const adminRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const adminUser = adminRes.rows[0];
        if (!await bcrypt.compare(adminPassword, adminUser.password_hash)) {
            return res.status(401).json({ error: 'Incorrect admin password.' });
        }

        // 2. Prevent deleting self
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself.' });
        }

        // 3. Protect developer account (check if target user is developer)
        const targetUserRes = await pool.query(
            'SELECT role, username FROM users WHERE id = $1',
            [userId]
        );

        if (targetUserRes.rows.length > 0) {
            const targetUser = targetUserRes.rows[0];
            if (targetUser.role === 'developer' || targetUser.username === 'dev') {
                return res.status(403).json({ error: 'Cannot delete protected developer account.' });
            }
        }

        // 4. Delete Target User (Ensure same house)
        await pool.query('DELETE FROM users WHERE id = $1 AND household_id = $2', [userId, req.user.householdId]);

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Reset House Data (Admin or Co-Admin Only)
app.post('/api/house/reset', authenticateToken, async (req, res) => {
    // Allow both admin and co-admin to reset data
    if (req.user.role !== 'admin' && req.user.role !== 'co-admin') {
        return res.sendStatus(403);
    }

    const { adminPassword } = req.body;

    try {
        // Verify password (works for both admin and co-admin)
        const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const currentUser = userRes.rows[0];
        if (!await bcrypt.compare(adminPassword, currentUser.password_hash)) {
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        // Delete all receipts for this household
        await pool.query('DELETE FROM receipts WHERE household_id = $1', [req.user.householdId]);

        res.json({ message: 'All house data has been reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Promote Member to Co-Admin (Admin Only)
app.post('/api/members/promote', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { userId } = req.body;

    try {
        // Ensure user is in same household
        const userRes = await pool.query(
            'SELECT id, role FROM users WHERE id = $1 AND household_id = $2',
            [userId, req.user.householdId]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in this household' });
        }

        const targetUser = userRes.rows[0];

        // Don't promote if already admin or co-admin
        if (targetUser.role === 'admin') {
            return res.status(400).json({ error: 'User is already an admin' });
        }

        if (targetUser.role === 'co-admin') {
            return res.status(400).json({ error: 'User is already a co-admin' });
        }

        // Promote to co-admin
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['co-admin', userId]);

        res.json({ message: 'Member promoted to Co-Admin successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Demote Co-Admin to Member (Admin Only)
app.post('/api/members/demote', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { userId } = req.body;

    try {
        // Ensure user is in same household and is co-admin
        const userRes = await pool.query(
            'SELECT id, role FROM users WHERE id = $1 AND household_id = $2',
            [userId, req.user.householdId]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in this household' });
        }

        const targetUser = userRes.rows[0];

        if (targetUser.role !== 'co-admin') {
            return res.status(400).json({ error: 'User is not a co-admin' });
        }

        // Demote to member
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['member', userId]);

        res.json({ message: 'Co-Admin demoted to Member successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Transfer Admin Role (Admin Only)
app.post('/api/members/transfer-admin', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { userId, adminPassword } = req.body;

    try {
        // Verify admin password
        const adminRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const admin = adminRes.rows[0];
        if (!await bcrypt.compare(adminPassword, admin.password_hash)) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Check target user exists and is in same household
        const targetRes = await pool.query(
            'SELECT id, role FROM users WHERE id = $1 AND household_id = $2',
            [userId, req.user.householdId]
        );

        if (targetRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in this household' });
        }

        // Transfer: new admin, old admin becomes member
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', userId]);
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['member', req.user.id]);

        res.json({ message: 'Admin role transferred successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Transfer Co-Admin Role (Co-Admin Only)
app.post('/api/members/transfer-coadmin', authenticateToken, async (req, res) => {
    if (req.user.role !== 'co-admin') return res.sendStatus(403);

    const { userId, password } = req.body;

    try {
        // Verify co-admin password
        const coAdminRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const coAdmin = coAdminRes.rows[0];
        if (!await bcrypt.compare(password, coAdmin.password_hash)) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Check target user exists and is in same household
        const targetRes = await pool.query(
            'SELECT id, role FROM users WHERE id = $1 AND household_id = $2',
            [userId, req.user.householdId]
        );

        if (targetRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in this household' });
        }

        const target = targetRes.rows[0];

        // Cannot transfer to admin or existing co-admin
        if (target.role === 'admin') {
            return res.status(400).json({ error: 'Cannot transfer to admin' });
        }

        if (target.role === 'co-admin') {
            return res.status(400).json({ error: 'User is already a co-admin' });
        }

        // Transfer: new co-admin, old co-admin becomes member
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['co-admin', userId]);
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['member', req.user.id]);

        res.json({ message: 'Co-Admin role transferred successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update Username (Self) - Only prefix
app.post('/api/user/update-username', authenticateToken, async (req, res) => {
    const { newUsername } = req.body;

    // Validate
    const userErr = validateUsername(newUsername);
    if (userErr) return res.status(400).json({ error: userErr });
    try {
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername.toLowerCase(), req.user.id]);
        res.json({ message: 'Username updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Nickname (Self)
app.post('/api/user/update-nickname', authenticateToken, async (req, res) => {
    const { newNickname } = req.body;
    try {
        await pool.query('UPDATE users SET nickname = $1 WHERE id = $2', [newNickname, req.user.id]);
        res.json({ message: 'Nickname updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Username (Self)
app.post('/api/user/update-username', authenticateToken, async (req, res) => {
    const { newUsername } = req.body;

    // Validate username
    if (!/^[a-z0-9]+$/.test(newUsername)) {
        return res.status(400).json({ error: 'Username must be alphanumeric' });
    }

    try {
        // Check if username already exists in same household
        const checkRes = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND household_id = $2',
            [newUsername, req.user.householdId]
        );

        if (checkRes.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken in this household' });
        }

        // Update username
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, req.user.id]);
        res.json({ message: 'Username updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Avatar (Self)
app.post('/api/user/update-avatar', authenticateToken, async (req, res) => {
    const { avatar } = req.body;

    // Validate avatar name (updated with paths)
    const validAvatars = ['male/avatar1.png', 'male/avatar2.png', 'male/avatar3.png', 'female/avatar4.png', 'male/avatar5.png', 'male/avatar6.png'];
    if (!validAvatars.includes(avatar)) {
        return res.status(400).json({ error: 'Invalid avatar' });
    }

    try {
        // Check if avatar is already used by another member in same household
        const avatarCheck = await pool.query(
            'SELECT id FROM users WHERE avatar = $1 AND household_id = $2 AND id != $3',
            [avatar, req.user.householdId, req.user.id]
        );

        if (avatarCheck.rows.length > 0) {
            return res.status(400).json({ error: 'This avatar is already taken by another household member.' });
        }

        await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.user.id]);
        res.json({ message: 'Avatar updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change Password (Self)
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Validate New Password
    // Use req.user.username to check for similarity
    const passErr = validatePassword(newPassword, req.user.username);
    if (passErr) return res.status(400).json({ error: passErr });
    try {
        const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = userRes.rows[0];

        if (!await bcrypt.compare(oldPassword, user.password_hash)) {
            return res.status(401).json({ error: 'Incorrect old password.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- DEVELOPER ANALYTICS (Developer Role Only) ---

app.get('/api/dev/analytics', authenticateToken, async (req, res) => {
    try {
        // Only allow developer role
        if (req.user.role !== 'developer') {
            return res.sendStatus(403);
        }

        // Get total households
        const householdsRes = await pool.query('SELECT COUNT(*) FROM households');
        const totalHouseholds = parseInt(householdsRes.rows[0].count);

        // Get total users
        const usersRes = await pool.query('SELECT COUNT(*) FROM users');
        const totalUsers = parseInt(usersRes.rows[0].count);

        // Get households with user counts
        const householdsWithUsersRes = await pool.query(`
            SELECT 
                h.name as house_name,
                COUNT(u.id) as user_count,
                MAX(r.created_at) as last_receipt_date
            FROM households h
            LEFT JOIN users u ON h.id = u.household_id
            LEFT JOIN receipts r ON h.id = r.household_id
            WHERE h.name != 'vudki'
            GROUP BY h.name
            ORDER BY user_count DESC
        `);

        // Get total receipts
        const receiptsRes = await pool.query('SELECT COUNT(*) FROM receipts');
        const totalReceipts = parseInt(receiptsRes.rows[0].count);

        res.json({
            totalHouseholds: totalHouseholds - 1, // Exclude vudki household
            totalUsers: totalUsers - 1, // Exclude dev user
            totalReceipts,
            households: householdsWithUsersRes.rows
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- DATA ROUTES (Protected) ---

app.get('/api/balances', authenticateToken, async (req, res) => {
    try {
        // Scoped to Household
        const usersRes = await pool.query('SELECT id, username, nickname, role, avatar, gender FROM users WHERE household_id = $1', [req.user.householdId]);
        const receiptsRes = await pool.query('SELECT * FROM receipts WHERE household_id = $1', [req.user.householdId]);

        const users = usersRes.rows;
        const receipts = receiptsRes.rows;

        // Self-Healing: Fix NULLs and Duplicates ensuring Gender Match
        const maleAvatars = ['male/avatar1.png', 'male/avatar2.png', 'male/avatar3.png', 'male/avatar5.png', 'male/avatar6.png'];
        const femaleAvatars = ['female/avatar4.png'];

        const taken = new Set();

        console.log('--- Self-Healing Check ---');
        console.log('Before:', users.map(u => `${u.username}:${u.avatar}`));

        // Pass 1: Identify valid assignments
        for (const u of users) {
            const avatarPool = (u.gender === 'female') ? femaleAvatars : maleAvatars;
            // Must be in correct pool to be valid
            if (u.avatar && !taken.has(u.avatar) && avatarPool.includes(u.avatar)) {
                taken.add(u.avatar);
                u._keep = true;
            } else {
                u._keep = false;
            }
        }

        // Pass 2: Reassign invalid
        for (let i = 0; i < users.length; i++) {
            if (!users[i]._keep) {
                const targetPool = (users[i].gender === 'female') ? femaleAvatars : maleAvatars;
                const available = targetPool.filter(a => !taken.has(a));

                let picked;
                if (available.length > 0) {
                    picked = available[0];
                } else {
                    // Fallback: Pick random from target pool (collision unavoidable)
                    picked = targetPool[Math.floor(Math.random() * targetPool.length)];
                }

                console.log(`Fixing ${users[i].username} (${users[i].gender}) (was ${users[i].avatar}) -> New: ${picked}`);

                await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [picked, users[i].id]);
                users[i].avatar = picked;
                taken.add(picked);
            }
        }
        console.log('After:', users.map(u => `${u.username}:${u.avatar}`));
        console.log('--------------------------');

        if (users.length === 0) return res.json({ total: 0, fairShare: 0, balances: [] });

        const totalExpenses = receipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const fairShare = totalExpenses / users.length;

        const balances = users.map(user => {
            const paid = receipts
                .filter(r => r.uploaded_by === user.id)
                .reduce((sum, r) => sum + parseFloat(r.amount), 0);
            return {
                id: user.id,
                name: user.nickname, // RETURN NICKNAME AS NAME
                username: user.username,
                role: user.role,
                paid: paid,
                balance: paid - fairShare,
                avatar: user.avatar
            };
        });

        res.json({
            total: totalExpenses,
            fairShare,
            balances
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/receipts', authenticateToken, async (req, res) => {
    try {
        // Create a map of userID -> Nickname
        const usersRes = await pool.query('SELECT id, nickname FROM users WHERE household_id = $1', [req.user.householdId]);
        const userMap = {};
        usersRes.rows.forEach(u => userMap[u.id] = u.nickname);

        const result = await pool.query(
            'SELECT * FROM receipts WHERE household_id = $1 ORDER BY created_at DESC',
            [req.user.householdId]
        );

        // Attach user_name (nickname) to receipt
        const receipts = result.rows.map(r => ({
            ...r,
            user_name: userMap[r.uploaded_by] || 'Unknown'
        }));

        res.json(receipts);
    } catch (error) {
        // res.status(500).send(error.message); // This line was probably misplaced
        console.error(error); // Log error for GET /api/receipts
        res.status(500).send(error.message);
    }
});

// Analyze Receipt (OCR) - Production Multi-Pass Engine
const ThermalReceiptOCR = require('./ThermalReceiptOCR');

app.post('/api/receipts/analyze', authenticateToken, upload.single('receipt'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const imagePath = 'uploads/' + req.file.filename;
    const fullPath = req.file.path;

    try {
        console.log(`\n==== OCR Request for ${req.file.filename} ====`);

        // Initialize OCR engine (medium mode = 6 passes for good balance)
        const ocr = new ThermalReceiptOCR({
            mode: 'medium',
            logFile: path.join(__dirname, 'server_debug.log')
        });

        // Run multi-pass OCR
        const result = await ocr.processReceipt(fullPath);

        console.log(`OCR Complete: Amount=$${result.amount}, Date=${result.date}, Confidence=${JSON.stringify(result.confidence)}`);

        // Return result with fallback to today's date if not found
        res.json({
            message: result.success ? 'Analysis complete' : 'Analysis complete with low confidence',
            data: {
                amount: result.amount || 0,
                date: result.date || new Date().toISOString().split('T')[0],
                description: 'Receipt',
                imagePath: imagePath,
                confidence: result.confidence,
                warning: result.warning,
                rawText: result.rawText
            }
        });

    } catch (error) {
        console.error("OCR Error:", error);
        res.status(500).send(error.message);
    }
});


// Delete Receipt
app.delete('/api/receipts/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Check Receipt Exists AND belongs to same household
        const receiptRes = await pool.query(
            'SELECT * FROM receipts WHERE id = $1 AND household_id = $2',
            [id, req.user.householdId]
        );

        if (receiptRes.rows.length === 0) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        const receipt = receiptRes.rows[0];

        // 2. Authorization Check (Uploader or Admin)
        if (receipt.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own receipts or be an admin.' });
        }

        // 3. Delete from DB (with household_id verification)
        await pool.query(
            'DELETE FROM receipts WHERE id = $1 AND household_id = $2',
            [id, req.user.householdId]
        );

        // 4. Optionally delete file (Async, don't block response)
        // path.join(__dirname, receipt.image_path) ...

        res.json({ message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm & Save Receipt
app.post('/api/receipts', authenticateToken, async (req, res) => {
    const { amount, description, date, imagePath } = req.body;

    // Validate
    if (!amount) return res.status(400).json({ error: 'Amount is required' });

    try {
        const result = await pool.query(
            'INSERT INTO receipts (uploaded_by, household_id, amount, description, image_path, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, req.user.householdId, parseFloat(amount), description, imagePath, date || new Date()]
        );

        res.json({
            message: 'Receipt saved successfully',
            receipt: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Serve static files from React Frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

// SPA Catch-all (Fallback middleware)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
        next();
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
