import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";

export const generateEmailToken = (): string => {
  return randomUUID();
};

export const generateOtp = (): string => {
  const numbers = "0123456789";
  let otp: string = "";

  for (let i = 0; i < 4; i++) {
    otp += numbers[Math.floor(Math.random() * 10)];
  }

  return otp;
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    await transporter
      .sendMail({
        from: `Cloutera <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
      })
      .then(() => {
        console.log(`${subject} mail sent to ${to} 🚀`);
      });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
