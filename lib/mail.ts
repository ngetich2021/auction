import nodemailer from "nodemailer";
import "server-only";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendMail(params: { to: string; subject: string; html: string }) {
  try {
    await transporter.sendMail({
      from: `Auctions <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (error) {
    console.error("Failed to send email", error);
  }
}
