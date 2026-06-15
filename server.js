const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

async function ensureSchema() {
  try {
    // Add role column to users if missing
    const [roleRows] = await pool.query("SHOW COLUMNS FROM users LIKE 'role'");
    if (!roleRows.length) {
      console.log('⚙️  Adding missing users.role column');
      await pool.query("ALTER TABLE users ADD COLUMN role ENUM('user','supplier','admin') DEFAULT 'user' AFTER email");
    }

    // Add stock column to products if missing
    const [stockRows] = await pool.query("SHOW COLUMNS FROM products LIKE 'stock'");
    if (!stockRows.length) {
      console.log('⚙️  Adding missing products.stock column');
      await pool.query("ALTER TABLE products ADD COLUMN stock INT DEFAULT 50 AFTER price");
    }

    // Add password column to users if missing
    const [passRows] = await pool.query("SHOW COLUMNS FROM users LIKE 'password'");
    if (!passRows.length) {
      console.log('⚙️  Adding missing users.password column');
      await pool.query("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL AFTER email");
      
      // Default password: 'admin123'
      const defaultHash = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa';
      await pool.query("UPDATE users SET password = ? WHERE password IS NULL", [defaultHash]);
    }

    // Ensure default admin exists
    const [adminRows] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    if (!adminRows.length) {
      console.log('⚙️  Creating default admin user (admin@rohlik.cz / admin123)');
      const defaultAdminHash = await bcrypt.hash('admin123', 10);
      await pool.query("INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@rohlik.cz', ?, 'admin')", [defaultAdminHash]);
    }

    // Create user_orders table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);

    // Create user_order_items table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES user_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_order_id (order_id)
      )
    `);

    console.log('✅ Database schema validated and ready');
  } catch (err) {
    console.error('Schema check failed:', err.message);
    throw err;
  }
}

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (place all HTML/CSS/JS next to /server)
app.use(express.static(path.join(__dirname, '../public')));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);

// Convenience aliases kept for compatibility with the requirements doc
app.use('/api/suppliers', (req, res, next) => { req.url = '/suppliers' + req.url; next(); }, orderRoutes);
app.use('/api/warehouses', (req, res, next) => { req.url = '/warehouses' + req.url; next(); }, orderRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── Start ───────────────────────────────────────────────────────
ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅  Rohlik IMS backend running on http://localhost:${PORT}`);
    });
  })
  .catch(() => {
    console.error('Server startup aborted because schema validation failed.');
    process.exit(1);
  });
