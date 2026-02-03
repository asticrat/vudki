# Vudki - House Expense Tracker

Vudki is a shared household expense tracking application designed to make splitting bills and managing finances with housemates simple and transparent. It features receipt scanning, automated splitting, and a clear "who owes who" dashboard.

## Features

*   **Receipt Scanning:** Upload receipts (image or camera) and use OCR to automatically extract amounts and dates.
*   **Expense Splitting:** Automatically splits expenses equally among household members.
*   **Balance Dashboard:** See exactly who owes what in real-time.
*   **Household Management:** Admin tools to manage members, roles (Admin, Co-Admin, Member), and settings.
*   **Secure:** JWT-based authentication and role-based access control.

## Tech Stack

*   **Frontend:** React (Vite), TailwindCSS, Framer Motion
*   **Backend:** Node.js, Express, PostgreSQL
*   **OCR:** Custom Thermal Receipt OCR engine (Tesseract.js + Image Processing)

## Setup & Installation

### Prerequisites

*   Node.js (v16+)
*   PostgreSQL

### 1. Database Setup

Create a PostgreSQL database named `house_split`.

```bash
psql -U postgres
CREATE DATABASE house_split;
```

### 2. Server Setup

Navigate to the server directory:

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=3000
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=house_split
DB_PASSWORD=your_postgres_password
DB_PORT=5432
JWT_SECRET=your_secure_random_secre_key
```

Initialize the database schema:

```bash
node init_db.js
```

Start the server:

```bash
npm start
```

### 3. Client Setup

Navigate to the client directory:

```bash
cd client
npm install
```

Start the development server:

```bash
npm run dev
```

## License

**Proprietary Software.**
Copyright (c) 2026 Vudki. All Rights Reserved.

Unauthorized copying of this file, via any medium is strictly prohibited.
The source code is proprietary and confidential.
