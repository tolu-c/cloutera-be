import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import Bull, { Job } from "bull";

const redisUri = process.env.REDIS_URI || "redis://localhost:6379";

export const sendEmailQueue = new Bull("email-queue", redisUri);

export const generateEmailToken = (): string => {
  return randomUUID();
};

export const generateOtp = (): string => {
  const numbers = "0123456789";
  let otp: string = "";

  for (let i = 0; i < 6; i++) {
    otp += numbers[Math.floor(Math.random() * 10)];
  }

  return otp;
};

sendEmailQueue.process(async (job: Job) => {
  const { to, subject, html } = job.data;
  try {
    const transporter = nodemailer.createTransport({
      pool: true,
      secure: false,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `Cloutera <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`${subject} mail sent to ${to} 🚀`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Let Bull handle retries
  }
});
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      pool: true,
      secure: false,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
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
    return;
  }
};
