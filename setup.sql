-- SaaS App Database Setup
-- Run these SQL commands in your MySQL database to set up the required tables

-- 1. Add 'role' column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role ENUM ('user', 'supplier', 'admin') DEFAULT 'user' AFTER email;

-- 2. Add 'stock' column to products table if it doesn't exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0 AFTER price;

-- 3. Create user_orders table for tracking user purchases
CREATE TABLE IF NOT EXISTS user_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    status ENUM (
        'pending',
        'completed',
        'cancelled'
    ) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_order_date (order_date)
);

-- 4. Create user_order_items table for tracking items in each order
CREATE TABLE IF NOT EXISTS user_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES user_orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id)
);

-- 5. Sample data (optional - insert some test products with stock)
INSERT INTO
    products (name, category, price, stock)
VALUES (
        'Laptop',
        'Electronics',
        999.99,
        10
    ),
    (
        'Mouse',
        'Electronics',
        29.99,
        50
    ),
    (
        'Keyboard',
        'Electronics',
        79.99,
        30
    ),
    (
        'Monitor',
        'Electronics',
        299.99,
        15
    ),
    (
        'USB Cable',
        'Accessories',
        9.99,
        100
    ),
    (
        'Phone Case',
        'Accessories',
        19.99,
        75
    ),
    (
        'Headphones',
        'Electronics',
        149.99,
        20
    ),
    (
        'Charger',
        'Accessories',
        39.99,
        40
    );

-- Verify your tables are created correctly
SHOW TABLES;

DESC user_orders;

DESC user_order_items;

-- ============================================================
-- SUPPLIER PURCHASE ORDER MIGRATIONS
-- Run these to enable supplier orders flowing into purchase_orders
-- ============================================================

-- 6. Add password column to users if not already present
--    (required for bcrypt login added in SaaS shop feature)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password VARCHAR(255) AFTER email;

-- 7. Allow 'Bulk' as an order_type in purchase_orders
--    The original schema only allowed Standard / Urgent / Blanket.
--    Supplier web shop orders use 'Bulk'.
ALTER TABLE purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_chk_order_type,
  DROP CHECK IF EXISTS purchase_orders_ibchk_1;

-- Re-add the constraint with Bulk included
ALTER TABLE purchase_orders
  ADD CONSTRAINT chk_order_type_v2
  CHECK (order_type IN ('Standard', 'Urgent', 'Blanket', 'Bulk'));

-- 8. Add index on suppliers.email for fast lookup during purchase
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers (email);