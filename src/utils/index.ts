import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import Bull, { Job } from "bull";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import juice from "juice";
import { Resend } from "resend";

const redisUri = process.env.REDIS_URI || "redis://localhost:6379";
const resendApiKey =
  process.env.RESEND_API_KEY || "re_YxLup7AA_2n6tjNmkGfAa4AnkuMRpMPYA";
const resend = new Resend(resendApiKey);

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

export async function sendEmailWithResend(
  to: string,
  subject: string,
  templateName: string,
  variables?: Record<string, string>,
) {
  // Read HTML template
  const templatePath = join(
    __dirname,
    "..",
    "templates",
    `${templateName}.html`,
  );
  let html = readFileSync(templatePath, "utf-8");

  // Replace variables in template
  if (variables) {
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, variables[key]);
    });
  }

  // Read the CSS file
  const cssPath = join(__dirname, "..", "assets", "output.css");
  const css = readFileSync(cssPath, "utf-8");

  // Replace link tag with inline style tag
  html = html.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["'][^"']*["']\s*\/?>/gi,
    `<style>${css}</style>`,
  );

  // Inline CSS
  html = juice(html, {
    removeStyleTags: true,
    preserveMediaQueries: true,
    preserveFontFaces: true,
  });

  // Replace image src with CID
  html = html.replace(
    /src="\.\/cloutera-header\.png"/g,
    'src="cid:cloutera-header"',
  );

  const { data, error } = await resend.emails.send({
    from: "Cloutera Hub <noreply@clouterahub.com>",
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.log(error);
    return console.log("Error sending email to", to);
  }
  if (data) {
    console.log(`Resend Email: ${subject} email sent to: ${to}`);
  }
  console.log("email data", { data });
}

export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  variables?: Record<string, string>,
) => {
  try {
    // Read HTML template
    const templatePath = join(
      __dirname,
      "..",
      "templates",
      `${templateName}.html`,
    );
    let html = readFileSync(templatePath, "utf-8");

    // Replace variables in template
    if (variables) {
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        html = html.replace(regex, variables[key]);
      });
    }

    // Read the CSS file
    const cssPath = join(__dirname, "..", "assets", "output.css");
    const css = readFileSync(cssPath, "utf-8");

    // Replace link tag with inline style tag
    html = html.replace(
      /<link\s+rel=["']stylesheet["']\s+href=["'][^"']*["']\s*\/?>/gi,
      `<style>${css}</style>`,
    );

    // Inline CSS
    html = juice(html, {
      removeStyleTags: true,
      preserveMediaQueries: true,
      preserveFontFaces: true,
    });

    // Replace image src with CID
    html = html.replace(
      /src="\.\/cloutera-header\.png"/g,
      'src="cid:cloutera-header"',
    );

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

    // Image attachment path
    const imagePath = join(__dirname, "..", "assets", "cloutera-header.png");

    await transporter
      .sendMail({
        from: `Cloutera <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
        attachments: [
          {
            filename: "cloutera-header.png",
            path: imagePath,
            cid: "cloutera-header",
          },
        ],
      })
      .then(() => {
        console.log(`${subject} mail sent to ${to} 🚀`);
      });
  } catch (error) {
    console.error("Error sending email:", error);
    return;
  }
};
