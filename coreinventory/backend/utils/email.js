const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp, name) => {
  await transporter.sendMail({
    from: `"CoreInventory" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset OTP - CoreInventory',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#1a1a1a">Password Reset</h2>
        <p>Hi ${name},</p>
        <p>Your OTP for password reset is:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2563eb;margin:24px 0;padding:16px;background:#eff6ff;border-radius:6px;text-align:center">${otp}</div>
        <p style="color:#666">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color:#999;font-size:12px;margin-top:24px">CoreInventory — Inventory Management System</p>
      </div>
    `,
  });
};

const sendLowStockAlert = async (email, alerts) => {
  const rows = alerts.map(a =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${a.product.name}</td>
     <td style="padding:8px;border-bottom:1px solid #eee">${a.product.sku}</td>
     <td style="padding:8px;border-bottom:1px solid #eee;color:#dc2626">${a.totalQty} ${a.product.unit}</td></tr>`
  ).join('');

  await transporter.sendMail({
    from: `"CoreInventory Alerts" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `⚠️ Low Stock Alert — ${alerts.length} product(s) need attention`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px">
        <h2 style="color:#dc2626">⚠️ Low Stock Alert</h2>
        <p>${alerts.length} product(s) are at or below reorder level:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead><tr style="background:#f9fafb">
            <th style="padding:8px;text-align:left">Product</th>
            <th style="padding:8px;text-align:left">SKU</th>
            <th style="padding:8px;text-align:left">Current Stock</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:24px;color:#666">Please create purchase orders to replenish stock.</p>
      </div>
    `,
  });
};

module.exports = { generateOTP, sendOTPEmail, sendLowStockAlert };
