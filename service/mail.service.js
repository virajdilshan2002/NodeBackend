import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "virajdilshan2019@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

export async function sendRegistrationEmail(to, username) {
  const subject = "Welcome to MyApp!";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Welcome, ${username}!</h2>
      <p>Thank you for registering with <strong>MyApp</strong>.</p>
      <p>We're excited to have you on board. You can now log in and start using the platform.</p>
      <a href="" 
         style="display: inline-block; padding: 10px 20px; margin-top: 10px; 
                background-color: #2563EB; color: #fff; border-radius: 6px; text-decoration: none;">
        Login Now
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        If you did not sign up for this account, please ignore this email.
      </p>
    </div>
  `;

  const mailOptions = {
    from: '"MyApp Team" <virajdilshan2019@gmail.com>',
    to: to,
    subject: subject,
    html: htmlContent,
  };

  try {
    console.log(mailOptions);
    
    const info = await transporter.sendMail(mailOptions);
    console.log("Registration email sent:", info.messageId);
  } catch (error) {
    console.error("Error sending registration email:", error);
  }
}

export async function sendOrderConfirmationEmail(to, pdfPath) {
  const mailOptions = {
    from: '"My App Order!"',
    to,
    subject: "Order Confirmation",
    text: "Thank you for your order! Please find your receipt attached.",
    attachments: [
      {
        filename: "Order_Receipt.pdf",
        path: pdfPath,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
