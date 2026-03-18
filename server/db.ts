import Database from 'better-sqlite3';
import path from 'path';

import fs from 'fs';

const dbPath = process.env.DATABASE_URL || 'license_manager.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'manager', 'viewer')) DEFAULT 'viewer',
    department TEXT
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    serial_number TEXT,
    description TEXT,
    system_scope TEXT,
    provider TEXT,
    service_code TEXT,
    contract_code TEXT,
    issue_date DATE,
    expiry_date DATE,
    business_contact TEXT,
    technical_contact TEXT,
    website TEXT,
    notes TEXT,
    status TEXT CHECK(status IN ('active', 'expiring', 'expired')) DEFAULT 'active',
    cost REAL DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    owner_id INTEGER,
    department TEXT,
    tags TEXT,
    is_important INTEGER DEFAULT 0,
    payment_process TEXT,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS renewal_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER,
    renewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    previous_expiry DATE,
    new_expiry DATE,
    cost REAL,
    payment_process TEXT,
    description TEXT,
    FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migrations
try {
  db.exec("ALTER TABLE licenses ADD COLUMN is_important INTEGER DEFAULT 0");
} catch (e) { }

try {
  db.exec("ALTER TABLE licenses ADD COLUMN payment_process TEXT");
} catch (e) { }

try {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT");
} catch (e) { }

try {
  db.exec("UPDATE users SET password = 'admin' WHERE role = 'admin' AND password IS NULL");
} catch (e) { }

try {
  db.exec("ALTER TABLE licenses ADD COLUMN deleted_at DATETIME");
} catch (e) { }

// Seed initial admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const adminId = db.prepare('INSERT INTO users (username, email, password, role, department) VALUES (?, ?, ?, ?, ?)')
    .run('admin', 'admin@example.com', 'admin', 'admin', 'IT').lastInsertRowid;

  // Add some sample licenses
  const sampleLicenses = [
    {
      name: 'Recovery Manager 8.x',
      provider: 'VMWare support',
      category: 'Subscription Service',
      serial_number: '429289767, 465440882',
      description: 'VMware Site Recovery Manager 8.x',
      system_scope: 'MISAONLINE, MISACA',
      issue_date: '2015-03-06',
      expiry_date: '2021-03-08',
      technical_contact: 'VMWare support',
      cost: 50000000,
      dept: 'IT'
    },
    {
      name: 'Utimaco HSM SE52 LAN V5',
      provider: 'Công ty TNHH Công nghệ',
      category: 'Warranty Service',
      serial_number: 'P5SAACE20036',
      description: 'Utimaco HSM SE52 LAN V5 Card PCIE',
      system_scope: 'Hệ thống CA',
      issue_date: '2019-10-23',
      expiry_date: '2021-10-23',
      cost: 120000000,
      dept: 'IT'
    },
    {
      name: 'Utimaco HSM SE500 LAN V5',
      provider: 'Công ty TNHH Công nghệ',
      category: 'Warranty Service',
      serial_number: 'P5SAACE20035',
      description: 'Utimaco HSM SE500 LAN V5 FIPS Card',
      system_scope: 'Hệ thống CA',
      issue_date: '2019-10-23',
      expiry_date: '2021-10-23',
      cost: 150000000,
      dept: 'IT'
    },
  ];

  const insertLicense = db.prepare(`
    INSERT INTO licenses (
      name, category, serial_number, description, system_scope, 
      provider, issue_date, expiry_date, technical_contact, 
      cost, owner_id, department, status, currency
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'VND')
  `);

  sampleLicenses.forEach(l => {
    insertLicense.run(
      l.name, l.category, l.serial_number, l.description, l.system_scope,
      l.provider, l.issue_date, l.expiry_date, l.technical_contact,
      l.cost, adminId, l.dept
    );
  });
}

export default db;
