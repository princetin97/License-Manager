import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import nodemailer from "nodemailer";
import cron from "node-cron";
import db from "./server/db.ts";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper to notify all clients
  const notifyClients = () => {
    io.emit("data_changed");
  };

  const logAction = (licenseId: number | bigint | null, action: string, details: string, userId: number = 1) => {
    db.prepare(`
      INSERT INTO audit_logs (license_id, user_id, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(licenseId, userId, action, details, new Date().toISOString());
  };

  // API Routes

  // Dashboard Stats
  app.get("/api/dashboard/stats", (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as count FROM licenses WHERE deleted_at IS NULL').get().count;
    const expired = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE deleted_at IS NULL AND expiry_date < date('now')").get().count;
    const expiringSoon = db.prepare(`
      SELECT COUNT(*) as count FROM licenses 
      WHERE deleted_at IS NULL AND expiry_date >= date('now') 
      AND (
        (is_important = 0 AND (
          strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now') 
          OR strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now', '+1 month')
        ))
        OR
        (is_important = 1 AND (
          strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now') 
          OR strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now', '+1 month')
          OR strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now', '+2 months')
          OR strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now', '+3 months')
        ))
      )
    `).get().count;
    const active = db.prepare(`
      SELECT COUNT(*) as count FROM licenses 
      WHERE deleted_at IS NULL AND expiry_date >= date('now') 
      AND (
        (is_important = 0 AND strftime('%Y-%m', expiry_date) > strftime('%Y-%m', 'now', '+1 month'))
        OR
        (is_important = 1 AND strftime('%Y-%m', expiry_date) > strftime('%Y-%m', 'now', '+3 months'))
      )
    `).get().count;
    const important = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE deleted_at IS NULL AND is_important = 1").get().count;

    const importantSummary = {
      total: important,
      expired: db.prepare("SELECT COUNT(*) as count FROM licenses WHERE deleted_at IS NULL AND is_important = 1 AND expiry_date < date('now')").get().count,
      expiringSoon: db.prepare(`
        SELECT COUNT(*) as count FROM licenses 
        WHERE deleted_at IS NULL AND is_important = 1 AND expiry_date >= date('now') 
        AND (
          strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now') 
          OR strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now', '+1 month')
          OR strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now', '+2 months')
          OR strftime('%Y-%m', expiry_date) = strftime('%Y-%m', 'now', '+3 months')
        )
      `).get().count,
      active: db.prepare(`
        SELECT COUNT(*) as count FROM licenses 
        WHERE deleted_at IS NULL AND is_important = 1 AND expiry_date >= date('now') 
        AND strftime('%Y-%m', expiry_date) > strftime('%Y-%m', 'now', '+3 months')
      `).get().count,
    };

    const costByDept = db.prepare(`
      SELECT department, SUM(cost) as total_cost 
      FROM licenses 
      WHERE deleted_at IS NULL
      GROUP BY department
    `).all();

    // Tạo danh sách 6 tháng tới để biểu đồ không bị trống
    const months = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const rawRenewals = db.prepare(`
      SELECT strftime('%Y-%m', expiry_date) as month, COUNT(*) as count
      FROM licenses
      WHERE deleted_at IS NULL AND expiry_date >= date('now', 'start of month')
      GROUP BY month
    `).all();

    const monthlyRenewals = months.map(m => ({
      month: m,
      count: (rawRenewals.find((r: any) => r.month === m) as any)?.count || 0
    }));

    const topProviders = db.prepare(`
      SELECT provider, COUNT(*) as count, SUM(cost) as total_cost
      FROM licenses
      WHERE deleted_at IS NULL AND provider IS NOT NULL AND provider != ''
      GROUP BY provider
      ORDER BY total_cost DESC
      LIMIT 5
    `).all();

    res.json({
      summary: { total, expired, expiringSoon, active, important },
      importantSummary,
      costByDept,
      monthlyRenewals,
      topProviders
    });
  });

  // Licenses CRUD
  app.get("/api/licenses", (req, res) => {
    const licenses = db.prepare(`
      SELECT l.*, u.username as owner_name 
      FROM licenses l 
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE l.deleted_at IS NULL
      ORDER BY l.expiry_date ASC
    `).all();
    res.json(licenses);
  });

  app.post("/api/licenses", (req, res) => {
    const {
      name, category, serial_number, description, system_scope,
      provider, service_code, contract_code, issue_date, expiry_date,
      business_contact, technical_contact, website, notes, cost, currency, owner_id, department, tags, is_important
    } = req.body;

    const result = db.prepare(`
      INSERT INTO licenses (
        name, category, serial_number, description, system_scope, 
        provider, service_code, contract_code, issue_date, expiry_date, 
        business_contact, technical_contact, website, notes, cost, currency, owner_id, department, tags, is_important
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, category, serial_number, description, system_scope,
      provider, service_code, contract_code, issue_date, expiry_date,
      business_contact, technical_contact, website, notes, cost, currency, owner_id, department, tags, is_important ? 1 : 0
    );

    logAction(result.lastInsertRowid, 'CREATE', `Đã thêm license mới: ${name}`);
    notifyClients();
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/licenses/bulk", (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ. Phải là một mảng." });
      }

      const insert = db.prepare(`
        INSERT INTO licenses (
          name, category, serial_number, description, system_scope, 
          provider, service_code, contract_code, issue_date, expiry_date, 
          business_contact, technical_contact, website, notes, cost, currency, owner_id, department, is_important
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((data) => {
        for (const item of data) {
          const result = insert.run(
            item.name, item.category, item.serial_number, item.description, item.system_scope,
            item.provider, item.service_code, item.contract_code, item.issue_date, item.expiry_date,
            item.business_contact, item.technical_contact, item.website, item.notes,
            item.cost || 0, item.currency || 'VND', item.owner_id || 1, item.department || 'IT',
            item.is_important ? 1 : 0
          );
          logAction(result.lastInsertRowid, 'CREATE', `Đã import license: ${item.name}`);
        }
      });

      transaction(items);
      notifyClients();
      res.json({ success: true, count: items.length });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(500).json({ error: error.message || "Lỗi máy chủ khi import dữ liệu." });
    }
  });

  app.put("/api/licenses/bulk/renew", (req, res) => {
    const { renewals } = req.body;
    if (!Array.isArray(renewals)) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ." });
    }

    try {
      const updateLicense = db.prepare(`
        UPDATE licenses 
        SET expiry_date = ?, payment_process = ?, updated_at = ?
        WHERE id = ?
      `);

      const insertHistory = db.prepare(`
        INSERT INTO renewal_history (license_id, previous_expiry, new_expiry, cost, payment_process, description, renewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((items) => {
        for (const item of items) {
          const license = db.prepare('SELECT name, expiry_date, cost FROM licenses WHERE id = ? AND deleted_at IS NULL').get(item.id);
          if (license) {
            updateLicense.run(item.expiry_date, item.payment_process || '', new Date().toISOString(), item.id);
            insertHistory.run(
              item.id,
              license.expiry_date,
              item.expiry_date,
              item.cost || license.cost,
              item.payment_process || '',
              `Gia hạn license ${license.name}`,
              new Date().toISOString()
            );
            logAction(Number(item.id), 'UPDATE', `Gia hạn: ${license.name} đến ngày ${item.expiry_date}. Quy trình: ${item.payment_process || 'N/A'}`);
          }
        }
      });

      transaction(renewals);
      notifyClients();
      res.json({ success: true, count: renewals.length });
    } catch (error: any) {
      console.error('Bulk renewal error:', error);
      res.status(500).json({ error: error.message || "Lỗi máy chủ khi gia hạn hàng loạt." });
    }
  });

  app.get("/api/licenses/:id/history", (req, res) => {
    const { id } = req.params;
    const history = db.prepare(`
      SELECT * FROM renewal_history 
      WHERE license_id = ? 
      ORDER BY renewed_at DESC
    `).all(id);
    res.json(history);
  });

  app.put("/api/licenses/:id", (req, res) => {
    const { id } = req.params;
    const {
      name, category, serial_number, description, system_scope,
      provider, service_code, contract_code, issue_date, expiry_date,
      business_contact, technical_contact, website, notes, cost, currency, owner_id, department, tags, is_important
    } = req.body;

    db.prepare(`
      UPDATE licenses 
      SET name = ?, category = ?, serial_number = ?, description = ?, system_scope = ?, 
          provider = ?, service_code = ?, contract_code = ?, issue_date = ?, expiry_date = ?, 
          business_contact = ?, technical_contact = ?, website = ?, notes = ?, 
          cost = ?, currency = ?, owner_id = ?, department = ?, tags = ?, is_important = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name, category, serial_number, description, system_scope,
      provider, service_code, contract_code, issue_date, expiry_date,
      business_contact, technical_contact, website, notes,
      cost, currency, owner_id, department, tags, is_important ? 1 : 0, new Date().toISOString(), id
    );

    logAction(Number(id), 'UPDATE', `Đã cập nhật license: ${name}`);
    notifyClients();
    res.json({ success: true });
  });

  app.delete("/api/licenses/bulk", (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ." });
    }

    try {
      const softDeleteStmt = db.prepare('UPDATE licenses SET deleted_at = ? WHERE id = ?');

      const transaction = db.transaction((licenseIds) => {
        const now = new Date().toISOString();
        for (const id of licenseIds) {
          const license = db.prepare('SELECT name FROM licenses WHERE id = ?').get(id);
          if (license) {
            logAction(null, 'DELETE', `Chuyển vào thùng rác: ${license.name}`);
            softDeleteStmt.run(now, id);
          }
        }
      });

      transaction(ids);
      notifyClients();
      res.json({ success: true, count: ids.length });
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ error: error.message || "Lỗi máy chủ khi xóa hàng loạt." });
    }
  });

  app.delete("/api/licenses/:id", (req, res) => {
    const { id } = req.params;
    try {
      const license = db.prepare('SELECT name FROM licenses WHERE id = ?').get(id);
      if (license) {
        logAction(null, 'DELETE', `Chuyển vào thùng rác: ${license.name}`);
        db.prepare('UPDATE licenses SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), id);
        notifyClients();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Không tìm thấy license." });
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({ error: error.message || "Lỗi máy chủ khi xóa license." });
    }
  });

  // Trash Endpoints
  app.get("/api/licenses/trash", (req, res) => {
    const licenses = db.prepare(`
      SELECT l.*, u.username as owner_name 
      FROM licenses l 
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE l.deleted_at IS NOT NULL
      ORDER BY l.deleted_at DESC
    `).all();
    res.json(licenses);
  });

  app.post("/api/licenses/:id/restore", (req, res) => {
    const { id } = req.params;
    try {
      const license = db.prepare('SELECT name FROM licenses WHERE id = ?').get(id);
      if (license) {
        db.prepare('UPDATE licenses SET deleted_at = NULL WHERE id = ?').run(id);
        logAction(Number(id), 'RESTORE', `Khôi phục license từ thùng rác: ${license.name}`);
        notifyClients();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Không tìm thấy license trong thùng rác." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/licenses/:id/permanent", (req, res) => {
    const { id } = req.params;
    try {
      const license = db.prepare('SELECT name FROM licenses WHERE id = ?').get(id);
      if (license) {
        db.prepare('UPDATE audit_logs SET license_id = NULL WHERE license_id = ?').run(id);
        db.prepare('DELETE FROM licenses WHERE id = ?').run(id);
        logAction(null, 'DELETE', `Xóa vĩnh viễn license: ${license.name}`);
        notifyClients();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Không tìm thấy license." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auto Purge Task (can be called manually or scheduled)
  const purgeOldTrash = () => {
    try {
      const oldLicenses = db.prepare("SELECT id, name FROM licenses WHERE deleted_at < date('now', '-30 days')").all();
      if (oldLicenses.length > 0) {
        const deleteStmt = db.prepare('DELETE FROM licenses WHERE id = ?');
        const updateLogsStmt = db.prepare('UPDATE audit_logs SET license_id = NULL WHERE license_id = ?');

        const transaction = db.transaction((items) => {
          for (const l of items) {
            updateLogsStmt.run(l.id);
            deleteStmt.run(l.id);
            console.log(`Auto purged: ${l.name}`);
          }
        });
        transaction(oldLicenses);
        notifyClients();
      }
    } catch (error) {
      console.error('Purge trash error:', error);
    }
  };

  // Run purge on startup and then daily
  purgeOldTrash();
  setInterval(purgeOldTrash, 24 * 60 * 60 * 1000);

  // Users
  app.get("/api/users", (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  // Audit Logs
  app.get("/api/history", (req, res) => {
    const logs = db.prepare(`
      SELECT a.*, u.username, l.name as license_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN licenses l ON a.license_id = l.id
      ORDER BY a.timestamp DESC
      LIMIT 100
    `).all();
    res.json(logs);
  });

  // System Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare('SELECT * FROM system_settings').all();
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.put("/api/settings", (req, res) => {
    const settings = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');

    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        upsert.run(key, String(value));
      }
    });

    try {
      transaction(settings);
      notifyClients();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings/test-email", async (req, res) => {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpTo, smtpSenderName, smtpSenderEmail } = req.body;
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort) || 587,
        secure: smtpSecure === 'true' || smtpSecure === true,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      // Get some data for the test email to make it look real
      let expiringLicenses = db.prepare(`
        SELECT * FROM licenses 
        WHERE deleted_at IS NULL 
        LIMIT 5
      `).all();

      if (expiringLicenses.length === 0) {
        expiringLicenses = [
          { name: '[Mẫu TEST] Tên miền công ty (domain.com)', category: 'Domain', expiry_date: '2024-12-31', department: 'IT', contract_code: 'DOM-01' },
          { name: '[Mẫu TEST] Office 365 License', category: 'Software', expiry_date: '2024-11-20', department: 'HC', contract_code: 'O365-2024' }
        ];
      }

      const senderName = smtpSenderName || "License Manager";
      const senderEmail = smtpSenderEmail || smtpUser;
      const html = generateEmailHtml(expiringLicenses);

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: smtpTo,
        subject: `[TEST] Thử nghiệm Mail thông báo - License Manager`,
        html: `<h3>ĐÂY LÀ EMAIL THỬ NGHIỆM TỪ LICENSE MANAGER</h3><hr/>` + html
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Test email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const generateEmailHtml = (expiringLicenses: any[]) => {
    let html = "<h2>[Tự động] Danh sách License sắp hết hạn (Trong 3 tháng tới)</h2>";
    html += "<p>Hệ thống tự động thông báo các dịch vụ, phần mềm, domain sắp hết hạn trong 3 tháng tới cần được ưu tiên xem xét gia hạn:</p>";
    html += "<table border='1' cellpadding='10' cellspacing='0' style='border-collapse: collapse; width: 100%; border-color: #e2e8f0; font-family: sans-serif;'>";
    html += "<tr style='background-color: #f1f5f9; font-weight: bold;'><th>Tên dịch vụ</th><th>Phân loại</th><th>Ngày hết hạn</th><th>Mã bộ phận</th><th>Người dùng/Hợp đồng</th></tr>";

    for (const l of expiringLicenses) {
      html += `<tr>
        <td><b>${l.name}</b></td>
        <td>${l.category || ''}</td>
        <td><b style='color: #dc2626;'>${l.expiry_date}</b></td>
        <td>${l.department || ''}</td>
        <td>${l.contract_code || l.serial_number || ''}</td>
      </tr>`;
    }
    html += "</table>";
    html += "<p><i>Email tự động được gửi từ hệ thống License Manager. Không phản hồi lại email này.</i></p>";
    return html;
  };

  app.get("/api/settings/preview-email", (req, res) => {
    let expiringLicenses = db.prepare(`
      SELECT * FROM licenses 
      WHERE deleted_at IS NULL 
      AND expiry_date >= date('now')
      AND expiry_date <= date('now', '+3 months')
      ORDER BY expiry_date ASC
      LIMIT 10
    `).all();

    if (expiringLicenses.length === 0) {
      // Dummy data only for preview visualization when there's no expiring license
      expiringLicenses = [
        { name: '[Mẫu] Tên miền công ty (domain.com)', category: 'Domain', expiry_date: new Date().toISOString().split('T')[0], department: 'IT', contract_code: 'DOM-01' },
        { name: '[Mẫu] Office 365 License', category: 'Software', expiry_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0], department: 'HC', contract_code: 'O365-2024' }
      ];
    }

    res.send(generateEmailHtml(expiringLicenses));
  });

  // Setup Cron Job for Monthly Notification (Runs at 08:00 AM everyday)
  cron.schedule('0 8 * * *', async () => {
    try {
      const settings = db.prepare('SELECT * FROM system_settings').all().reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      const emailDay = parseInt(settings.emailDay) || 1;
      const today = new Date();
      if (today.getDate() !== emailDay) return;

      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.smtpTo) {
        console.log("No SMTP config. Skipping monthly email.");
        return;
      }

      const expiringLicenses = db.prepare(`
        SELECT * FROM licenses 
        WHERE deleted_at IS NULL 
        AND expiry_date >= date('now')
        AND expiry_date <= date('now', '+3 months')
        ORDER BY expiry_date ASC
      `).all();

      if (expiringLicenses.length === 0) return;

      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: Number(settings.smtpPort) || 587,
        secure: settings.smtpSecure === 'true' || settings.smtpSecure === true,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass
        }
      });

      const html = generateEmailHtml(expiringLicenses);

      const senderName = settings.smtpSenderName || "License Manager";
      const senderEmail = settings.smtpSenderEmail || settings.smtpUser;

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: settings.smtpTo,
        subject: `[Cảnh báo] Có ${expiringLicenses.length} License sắp hết hạn cần xử lý`,
        html: html
      });
      console.log(`[Cron] Sent monthly notification for ${expiringLicenses.length} licenses.`);

    } catch (error) {
      console.error("[Cron] Monthly cron job error:", error);
    }
  });


  // Admin Auth
  app.post("/api/admin/auth", (req, res) => {
    const { password } = req.body;
    const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' AND password = ?").get(password);
    if (admin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Mật khẩu không chính xác." });
    }
  });

  app.post("/api/admin/change-password", (req, res) => {
    const { newPassword } = req.body;
    try {
      db.prepare("UPDATE users SET password = ? WHERE role = 'admin'").run(newPassword);
      logAction(null, 'UPDATE', 'Đã thay đổi mật khẩu quản trị viên');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
