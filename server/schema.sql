-- Drop existing tables to restart with clean schema
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS households;

-- Create Households Table
CREATE TABLE households (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- The 'suffix' e.g. 'daisy'
    address TEXT,
    max_members INT DEFAULT 6
);

-- Create Users Table with Household Link
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL, -- login identifier e.g. 'suman'
    nickname TEXT NOT NULL, -- Display name e.g. 'Suman'
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'co-admin', 'member', 'developer')) NOT NULL,
    avatar TEXT,
    gender TEXT DEFAULT 'male',
    household_id INT REFERENCES households(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(username, household_id) -- Username must be unique WITHIN a household
);

-- Recreate Receipts Table
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    household_id INT REFERENCES households(id) ON DELETE CASCADE,
    amount NUMERIC(10,2),
    description TEXT,
    image_path TEXT,
    created_at TIMESTAMP DEFAULT now()
);
