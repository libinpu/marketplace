const express = require("express");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");
const professionalRoutes = require("./routes/professionalRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const pool = require("./config/database");
const { startReminderScheduler } = require("./services/reminderService");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
    res.json({ message: "Service Marketplace API is running!" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/professionals", professionalRoutes);
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

    try {
        await pool.query('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL');
        await pool.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT');
        await pool.query('ALTER TABLE professionals ADD COLUMN IF NOT EXISTS profile_photo TEXT');
        await pool.query('ALTER TABLE professionals ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE');
        await pool.query('ALTER TABLE professionals ADD COLUMN IF NOT EXISTS work_radius INTEGER DEFAULT 10');
        await pool.query('ALTER TABLE professionals ADD COLUMN IF NOT EXISTS work_latitude DECIMAL(10, 8)');
        await pool.query('ALTER TABLE professionals ADD COLUMN IF NOT EXISTS work_longitude DECIMAL(11, 8)');
        
        await pool.query('ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_verification_status_check');
        await pool.query("ALTER TABLE professionals ADD CONSTRAINT professionals_verification_status_check CHECK (verification_status IN ('incomplete', 'pending', 'verified', 'rejected'))");
    } catch (error) {
        console.error('OAuth user schema initialization failed:', error.message);
    }

    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS professional_reviews (
            id SERIAL PRIMARY KEY,
            request_id INTEGER NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
            customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        `);
    } catch (error) {
        console.error('Professional reviews table initialization failed:', error.message);
    }

    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS user_addresses (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            address_type VARCHAR(50) NOT NULL DEFAULT 'home',
            address_line TEXT NOT NULL,
            landmark TEXT,
            city VARCHAR(100) DEFAULT 'Thiruvananthapuram',
            state VARCHAR(100) DEFAULT 'Kerala',
            pincode VARCHAR(20),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id)`);
    } catch (error) {
        console.error('User addresses table initialization failed:', error.message);
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const migration016Path = path.join(__dirname, 'migrations', '016_add_requested_subcategories.sql');
        if (fs.existsSync(migration016Path)) {
            const sql = fs.readFileSync(migration016Path, 'utf-8');
            await pool.query(sql);
        }
        const migration017Path = path.join(__dirname, 'migrations', '017_delete_requested_service_categories.sql');
        if (fs.existsSync(migration017Path)) {
            const sql017 = fs.readFileSync(migration017Path, 'utf-8');
            await pool.query(sql017);
        }
        const migration018Path = path.join(__dirname, 'migrations', '018_add_plumbing_and_vehicle_recovery.sql');
        if (fs.existsSync(migration018Path)) {
            const sql018 = fs.readFileSync(migration018Path, 'utf-8');
            await pool.query(sql018);
        }
        const migration019Path = path.join(__dirname, 'migrations', '019_persist_notifications_read_status.sql');
        if (fs.existsSync(migration019Path)) {
            const sql019 = fs.readFileSync(migration019Path, 'utf-8');
            await pool.query(sql019);
        }
        const migration020Path = path.join(__dirname, 'migrations', '020_add_professional_logins.sql');
        if (fs.existsSync(migration020Path)) {
            const sql020 = fs.readFileSync(migration020Path, 'utf-8');
            await pool.query(sql020);
        }
        const migration021Path = path.join(__dirname, 'migrations', '021_add_category_prices.sql');
        if (fs.existsSync(migration021Path)) {
            const sql021 = fs.readFileSync(migration021Path, 'utf-8');
            await pool.query(sql021);
        }
        const migration022Path = path.join(__dirname, 'migrations', '022_add_district_pricing_tiers.sql');
        if (fs.existsSync(migration022Path)) {
            const sql022 = fs.readFileSync(migration022Path, 'utf-8');
            await pool.query(sql022);
        }
        const migration023Path = path.join(__dirname, 'migrations', '023_create_phone_notifications.sql');
        if (fs.existsSync(migration023Path)) {
            const sql023 = fs.readFileSync(migration023Path, 'utf-8');
            await pool.query(sql023);
        }
    } catch (error) {
        console.error('Migrations execution error:', error.message);
    }

    try {
        startReminderScheduler(30000);
    } catch (err) {
        console.error('Failed to start reminder scheduler:', err.message);
    }
}

startServer().catch(error => {
    console.error('Server startup failed:', error.message);
    process.exit(1);
});