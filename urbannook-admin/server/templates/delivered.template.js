/**
 * delivered.template.js
 * Sent once when the shipment status transitions to DELIVERED.
 */

const deliveredTemplate = ({
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
        <td style="padding:14px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#333333; border-bottom:1px solid #F5ECD0; line-height:1.4;">
          ${s.productName || "Product"}
        </td>
        <td style="padding:14px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#777777; text-align:center; border-bottom:1px solid #F5ECD0;">
          ${qty}
        </td>
        <td style="padding:14px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C; text-align:right; border-bottom:1px solid #F5ECD0;">
          &#8377;${(price * qty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>`;
    })
    .join("");

  const formattedAmount = `&#8377;${(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const trackingUrl = `https://panel.shipmozo.com/track-order?awb_number=${awbNumber}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>:root { color-scheme: light only; supported-color-schemes: light; }</style>
</head>
<body style="margin:0; padding:0; background-color:#FAFAF8; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="width:100%; background-color:#FAFAF8; padding:40px 20px;">
  <tr><td align="center">

    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
           style="width:100%; max-width:600px; background-color:#ffffff;">

      <!-- HEADER -->
      <tr>
        <td align="center" style="padding:44px 40px 20px;">
          <img src="${process.env.EMAIL_ASSET_DARK_LOGO}"
               alt=""
               width="120"
               style="display:block; border:0; max-width:120px; height:auto; margin:0 auto;" />
          <div style="width:60px; height:1px; background-color:#F5DEB3; margin:14px auto 0;"></div>
        </td>
      </tr>

      <!-- HERO -->
      <tr>
        <td align="center" style="padding:44px 48px 16px;">
          <h2 style="margin:0 0 16px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:27px; font-weight:600; color:#2E443C; line-height:1.25; letter-spacing:-0.3px;">
            Your order has arrived.
          </h2>
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#666666; line-height:1.75; max-width:420px;">
            Dear <strong style="color:#2E443C; font-weight:600;">${name}</strong>, your UrbanNook order has been successfully delivered. We hope you love it.
          </p>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td align="center" style="padding:28px 40px 44px;">
          <a href="${trackingUrl}"
             style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 44px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:2.5px; text-transform:uppercase;">
            View Shipment Details
          </a>
          <p style="margin:16px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; color:#AAAAAA; letter-spacing:0.5px;">
            AWB&nbsp;No.&nbsp;<strong style="color:#2E443C; letter-spacing:1px;">${awbNumber || "—"}</strong>
            &nbsp;&middot;&nbsp;
            via&nbsp;${courierCompany || "—"}
          </p>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- ORDER SUMMARY LABEL -->
      <tr>
        <td style="padding:32px 40px 18px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="border-bottom:1px solid #F5DEB3; padding-bottom:7px;">
                <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; letter-spacing:3px; color:#2E443C; text-transform:uppercase;">
                  Order Summary
                </span>
                <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; color:#AAAAAA; margin-left:10px; font-weight:400; text-transform:none; letter-spacing:0;">
                  ${items.length} item${items.length !== 1 ? "s" : ""}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ITEMS TABLE -->
      <tr>
        <td style="padding:0 40px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <thead>
              <tr>
                <th style="padding:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:600; color:#AAAAAA; text-transform:uppercase; letter-spacing:2px; text-align:left; border-bottom:1px solid #F5ECD0;">Product</th>
                <th style="padding:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:600; color:#AAAAAA; text-transform:uppercase; letter-spacing:2px; text-align:center; border-bottom:1px solid #F5ECD0;">Qty</th>
                <th style="padding:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:600; color:#AAAAAA; text-transform:uppercase; letter-spacing:2px; text-align:right; border-bottom:1px solid #F5ECD0;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:18px 0 4px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; font-weight:700; color:#2E443C; text-transform:uppercase; letter-spacing:2.5px; border-top:1px solid #F5DEB3; text-align:right; padding-right:24px;">
                  Total
                </td>
                <td style="padding:18px 0 4px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; font-weight:700; color:#2E443C; border-top:1px solid #F5DEB3; text-align:right;">
                  ${formattedAmount}
                </td>
              </tr>
            </tfoot>
          </table>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:20px 40px 0;"><div style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- SHIPPING + ADDRESS (2-col) -->
      <tr>
        <td style="padding:32px 40px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <!-- Left: Shipping Details -->
              <td width="44%" valign="top" style="padding-right:20px;">
                <p style="margin:0 0 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
                  Shipping Details
                </p>
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-bottom:11px; padding-right:14px; white-space:nowrap; vertical-align:top;">Order ID</td>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C; padding-bottom:11px;">#${orderId}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-bottom:11px; padding-right:14px; white-space:nowrap; vertical-align:top;">Courier</td>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C; padding-bottom:11px;">${courierCompany || "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-right:14px; white-space:nowrap; vertical-align:top;">AWB No.</td>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#2E443C;">${awbNumber || "—"}</td>
                  </tr>
                </table>
              </td>

              <!-- Right: Delivery Address -->
              <td width="56%" valign="top" style="border-left:1px solid #F5DEB3; padding-left:28px;">
                <p style="margin:0 0 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
                  Delivery Address
                </p>
                <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#444444; line-height:1.85;">
                  <strong style="color:#2E443C; font-weight:600;">${name}</strong><br/>
                  ${deliveryAddress || "—"}<br/>
                  ${mobileNumber ? `+91&nbsp;${mobileNumber}` : ""}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER / SUPPORT -->
      <tr>
        <td style="background-color:#F7F4EF; padding:32px 40px 36px; border-top:1px solid #EEE8DC;">
          <p style="margin:0 0 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.75;">
            We&#8217;d love to hear your feedback! Contact UrbanNook at
            <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" style="color:#2E443C; font-weight:600; text-decoration:none;">${process.env.ZOHO_ADMIN_EMAIL}</a>
            if you have any questions about your order.
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tr>
              <td style="border-top:1px solid #E8E0D5; padding-top:20px;">
                <p style="margin:0 0 5px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#2E443C; text-transform:uppercase; letter-spacing:2.5px;">
                  Seller Details
                </p>
                <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; color:#888888; line-height:1.7;">
                  UrbanNook &nbsp;&middot;&nbsp;
                  <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" style="color:#2E443C; text-decoration:none;">${process.env.ZOHO_ADMIN_EMAIL}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:22px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.6;">
            Warm regards,<br/>
            <strong style="color:#2E443C; letter-spacing:0.5px;">Team UrbanNook</strong>
          </p>
        </td>
      </tr>

      <!-- BOTTOM BAR -->
      <tr>
        <td style="background-color:#2E443C; padding:20px 40px; text-align:center;">
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; color:rgba(245,222,179,0.65); letter-spacing:0.5px;">
            &copy; ${new Date().getFullYear()} Urban Nook. All rights reserved.
          </p>
        </td>
      </tr>

    </table>

  </td></tr>
</table>

</body>
</html>`;
};

export default deliveredTemplate;
