const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixAdmin() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    console.log('New Hash:', hash);
    
    const [result] = await pool.query(
      "UPDATE users SET role = 'admin', password = ? WHERE email = 'admin@rohlik.cz'", 
      [hash]
    );
    
    console.log('Update Result:', result.affectedRows, 'row(s) updated.');
    
    // Verify
    const [rows] = await pool.query("SELECT id, email, role, password FROM users WHERE email = 'admin@rohlik.cz'");
    console.log('Verified User in DB:', rows[0]);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fixAdmin();
