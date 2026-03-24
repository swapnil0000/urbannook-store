import nodemailer from "nodemailer";

// Transporter is created lazily at call time so env vars are always loaded
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail app password (not account password)
    },
  });
}

/**
 * Send a dispatch confirmation email to the customer.
 * Called once per order when courier confirms pickup (idempotent via dispatchConfirmedAt).
 *
 * @param {{ to: string, customerName: string, orderId: string, awbNumber: string, courierCompany: string }} params
 */
export async function sendDispatchEmail({
  to,
  customerName,
  orderId,
  awbNumber,
  courierCompany,
}) {
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your UrbanNook Order Has Been Dispatched!</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Urban<span style="color:#e9d5ff;">Nook</span>
              </h1>
              <p style="margin:6px 0 0;color:#e9d5ff;font-size:13px;">Premium Home Decor &amp; Lifestyle</p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <!-- Dispatch icon -->
              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;background:#f0fdf4;border-radius:50%;padding:18px;border:2px solid #86efac;">
                  <span style="font-size:40px;">🚚</span>
                </div>
              </div>

              <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;text-align:center;">
                Great news! Your order is on its way.
              </h2>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;text-align:center;line-height:1.6;">
                Hi <strong style="color:#374151;">${customerName}</strong>, your UrbanNook order has been
                picked up by the courier and is heading your way!
              </p>

              <!-- Order details card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                          <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span><br/>
                          <span style="color:#111827;font-size:15px;font-weight:700;font-family:monospace;">${orderId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                          <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Courier Partner</span><br/>
                          <span style="color:#111827;font-size:15px;font-weight:600;">${courierCompany || "Our Courier Partner"}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tracking AWB</span><br/>
                          <span style="color:#7c3aed;font-size:15px;font-weight:700;font-family:monospace;">${awbNumber || "—"}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">
                  You can track your shipment using the AWB number above on the courier's website.
                </p>
              </div>

              <!-- Status timeline -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#7c3aed;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;">
                            <span style="color:#fff;font-size:14px;">✓</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#7c3aed;font-weight:600;">Order<br/>Placed</p>
                        </td>
                        <td style="width:60px;padding-bottom:20px;">
                          <div style="height:2px;background:#7c3aed;"></div>
                        </td>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#7c3aed;border-radius:50%;margin:0 auto;">
                            <span style="color:#fff;font-size:14px;line-height:32px;">✓</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#7c3aed;font-weight:600;">Picked<br/>Up</p>
                        </td>
                        <td style="width:60px;padding-bottom:20px;">
                          <div style="height:2px;background:#e5e7eb;"></div>
                        </td>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#e5e7eb;border-radius:50%;margin:0 auto;">
                            <span style="color:#9ca3af;font-size:14px;line-height:32px;">→</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-weight:600;">In<br/>Transit</p>
                        </td>
                        <td style="width:60px;padding-bottom:20px;">
                          <div style="height:2px;background:#e5e7eb;"></div>
                        </td>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#e5e7eb;border-radius:50%;margin:0 auto;">
                            <span style="color:#9ca3af;font-size:14px;line-height:32px;">🏠</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-weight:600;">Delivered</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                Thank you for shopping with UrbanNook! 💜<br/>
                If you have any questions, feel free to reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: `"UrbanNook" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your UrbanNook order ${orderId} has been dispatched! 🚚`,
    html,
  });
}

/**
 * Send an "order is now in transit" email to the customer.
 * Triggered once when shipment status transitions to IN_TRANSIT (idempotent via transitEmailSentAt).
 *
 * @param {{ to: string, customerName: string, orderId: string, awbNumber: string, courierCompany: string }} params
 */
export async function sendInTransitEmail({
  to,
  customerName,
  orderId,
  awbNumber,
  courierCompany,
}) {
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your UrbanNook Order Is On Its Way!</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Urban<span style="color:#e9d5ff;">Nook</span>
              </h1>
              <p style="margin:6px 0 0;color:#e9d5ff;font-size:13px;">Premium Home Decor &amp; Lifestyle</p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <!-- Transit icon -->
              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;background:#eff6ff;border-radius:50%;padding:18px;border:2px solid #93c5fd;">
                  <span style="font-size:40px;">📦</span>
                </div>
              </div>

              <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;text-align:center;">
                Your order is in transit!
              </h2>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;text-align:center;line-height:1.6;">
                Hi <strong style="color:#374151;">${customerName}</strong>, great news!
                Your UrbanNook order has been picked up and is now on its way to you.
              </p>

              <!-- Order details card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                          <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span><br/>
                          <span style="color:#111827;font-size:15px;font-weight:700;font-family:monospace;">${orderId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                          <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Courier Partner</span><br/>
                          <span style="color:#111827;font-size:15px;font-weight:600;">${courierCompany || "Our Courier Partner"}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tracking AWB</span><br/>
                          <span style="color:#7c3aed;font-size:15px;font-weight:700;font-family:monospace;">${awbNumber || "—"}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Status timeline -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#7c3aed;border-radius:50%;margin:0 auto;">
                            <span style="color:#fff;font-size:14px;line-height:32px;">✓</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#7c3aed;font-weight:600;">Order<br/>Placed</p>
                        </td>
                        <td style="width:60px;padding-bottom:20px;">
                          <div style="height:2px;background:#7c3aed;"></div>
                        </td>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#7c3aed;border-radius:50%;margin:0 auto;">
                            <span style="color:#fff;font-size:14px;line-height:32px;">✓</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#7c3aed;font-weight:600;">Picked<br/>Up</p>
                        </td>
                        <td style="width:60px;padding-bottom:20px;">
                          <div style="height:2px;background:#7c3aed;"></div>
                        </td>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#7c3aed;border-radius:50%;margin:0 auto;">
                            <span style="color:#fff;font-size:14px;line-height:32px;">→</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#7c3aed;font-weight:600;">In<br/>Transit</p>
                        </td>
                        <td style="width:60px;padding-bottom:20px;">
                          <div style="height:2px;background:#e5e7eb;"></div>
                        </td>
                        <td style="text-align:center;width:80px;">
                          <div style="width:32px;height:32px;background:#e5e7eb;border-radius:50%;margin:0 auto;">
                            <span style="color:#9ca3af;font-size:14px;line-height:32px;">🏠</span>
                          </div>
                          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-weight:600;">Delivered</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;line-height:1.6;">
                You can track your shipment using the AWB number above on the courier's website.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                Thank you for shopping with UrbanNook! 💜<br/>
                If you have any questions, feel free to reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: `"UrbanNook" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your UrbanNook order ${orderId} is in transit! 📦`,
    html,
  });
}
