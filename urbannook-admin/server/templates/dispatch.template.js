/**
 * dispatch.template.js
 * Sent once when the courier picks up the order (AWB received).
 */

const dispatchTemplate = ({
  customerName,
  orderId,
  awbNumber,
  courierCompany,
  items = [],
  amount = 0,
  deliveryAddress = "",
  mobileNumber = "",
}) => {
  const name = customerName || "UrbanNook Customer";

  const itemRows = items
    .map((item) => {
      const s = item.productSnapshot || {};
      const qty = s.quantity || 1;
      const price = s.priceAtPurchase || 0;
      return `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #E5E5E5; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#2E443C;">
          ${s.productName || "Product"}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #E5E5E5; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#2E443C; text-align:center;">
          ${qty}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #E5E5E5; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#2E443C; text-align:right;">
          ₹${(price * qty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>`;
    })
    .join("");

  const formattedAmount = `₹${(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const trackingUrl = `https://panel.shipmozo.com/track-order`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>:root { color-scheme: light only; supported-color-schemes: light; }</style>
</head>
<body style="margin:0; padding:0; background-color:#2E443C;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="width:100%; background-color:#2E443C; padding:20px 10px;">
  <tr><td align="center">

    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
           style="width:100%; max-width:600px;">

      <!-- LOGO -->
      <tr>
        <td align="center" style="padding:24px 0 16px;">
          <h1 style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:28px; letter-spacing:1px; color:#ffffff;">
            UrbanNook
          </h1>
        </td>
      </tr>

      <!-- CARD -->
      <tr>
        <td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                 style="background-color:#F9F9F7; border-radius:16px; overflow:hidden;">

            <!-- HEADER BAND -->
            <tr>
              <td style="background-color:#2E443C; padding:20px 30px;">
                <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:rgba(255,255,255,0.7);">
                  Dear ${name},
                </p>
                <h2 style="margin:6px 0 0; font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:700; color:#ffffff;">
                  Your order is on its way!
                </h2>
              </td>
            </tr>

            <!-- GREETING -->
            <tr>
              <td style="padding:20px 30px 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#444; line-height:1.6;">
                Hi <strong>${name}</strong>, your order has been picked up by the courier and is heading your way!
              </td>
            </tr>

            <!-- TRACK BUTTON -->
            <tr>
              <td align="center" style="padding:20px 30px;">
                <a href="${trackingUrl}"
                   style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:8px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:600;">
                  Track Your Order
                </a>
                <p style="margin:10px 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#888;">
                  Enter your AWB number on the tracking page: <strong style="color:#2E443C;">${awbNumber || "—"}</strong>
                </p>
              </td>
            </tr>

            <!-- DIVIDER -->
            <tr><td style="padding:0 30px;"><div style="border-top:1px solid #E5E5E5;"></div></td></tr>

            <!-- ORDER DETAILS HEADING -->
            <tr>
              <td style="padding:20px 30px 10px;">
                <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:700; color:#2E443C;">
                  Order Details &nbsp;<span style="font-weight:400; font-size:13px; color:#888;">Total ${items.length} item${items.length !== 1 ? "s" : ""}</span>
                </p>
              </td>
            </tr>

            <!-- ITEMS TABLE -->
            <tr>
              <td style="padding:0 30px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <thead>
                    <tr style="background-color:#2E443C;">
                      <th style="padding:10px 12px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:600; color:#ffffff; text-align:left;">Product</th>
                      <th style="padding:10px 12px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:600; color:#ffffff; text-align:center;">Qty</th>
                      <th style="padding:10px 12px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:600; color:#ffffff; text-align:right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                  <tfoot>
                    <tr style="background-color:#2E443C;">
                      <td colspan="2" style="padding:12px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#ffffff;">Total Amount</td>
                      <td style="padding:12px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-align:right;">${formattedAmount}</td>
                    </tr>
                  </tfoot>
                </table>
              </td>
            </tr>

            <!-- DIVIDER -->
            <tr><td style="padding:0 30px;"><div style="border-top:1px solid #E5E5E5;"></div></td></tr>

            <!-- SHIPPING + ADDRESS (2-col) -->
            <tr>
              <td style="padding:20px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <!-- Shipping Details -->
                    <td width="48%" valign="top" style="padding-right:12px;">
                      <p style="margin:0 0 10px; font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; color:#2E443C;">
                        Shipping Details:
                      </p>
                      <table cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#888; padding-bottom:5px; white-space:nowrap; padding-right:8px;">Order ID :</td>
                          <td style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#2E443C; font-weight:600; padding-bottom:5px;">#${orderId}</td>
                        </tr>
                        <tr>
                          <td style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#888; padding-bottom:5px; white-space:nowrap; padding-right:8px;">Courier :</td>
                          <td style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#2E443C; font-weight:600; padding-bottom:5px;">${courierCompany || "—"}</td>
                        </tr>
                        <tr>
                          <td style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#888; white-space:nowrap; padding-right:8px;">AWB No. :</td>
                          <td style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#2E443C; font-weight:700;">${awbNumber || "—"}</td>
                        </tr>
                      </table>
                    </td>

                    <!-- Delivery Address -->
                    <td width="52%" valign="top">
                      <p style="margin:0 0 10px; font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; color:#2E443C;">
                        Delivery Address:
                      </p>
                      <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#555; line-height:1.7;">
                        <strong>${name}</strong><br/>
                        ${deliveryAddress || "—"}<br/>
                        ${mobileNumber ? `+91-${mobileNumber}` : ""}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- DIVIDER -->
            <tr><td style="padding:0 30px;"><div style="border-top:1px solid #E5E5E5;"></div></td></tr>

            <!-- CONTACT + SELLER -->
            <tr>
              <td style="padding:20px 30px 24px;">
                <p style="margin:0 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#555; line-height:1.6;">
                  Please contact UrbanNook at
                  <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" style="color:#2E443C; font-weight:600;">${process.env.ZOHO_ADMIN_EMAIL}</a>
                  if you have any product-related query or need help with your order.
                </p>
                <table cellpadding="0" cellspacing="0" role="presentation"
                       style="background-color:#F0F4F2; border-radius:8px; padding:14px 16px; width:100%;">
                  <tr>
                    <td>
                      <p style="margin:0 0 4px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:700; color:#2E443C;">
                        Seller Details:
                      </p>
                      <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#555; line-height:1.6;">
                        Seller Name: UrbanNook<br/>
                        Email ID: <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" style="color:#2E443C;">${process.env.ZOHO_ADMIN_EMAIL}</a>
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#555;">
                  Best Regards,<br/>
                  <strong style="color:#2E443C;">Team UrbanNook</strong>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="text-align:center; color:rgba(255,255,255,0.7); font-family:Arial,Helvetica,sans-serif; font-size:11px; padding:16px 0;">
          © 2026 Urban Nook. All rights reserved.
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>`;
};

export default dispatchTemplate;
