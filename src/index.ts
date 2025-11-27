import MongoStore from "connect-mongo";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import session from "express-session";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { generateToken } from "./controllers/auth";
import { startOrderStatusCron } from "./jobs/orderStatusCron";
import User, { type IUser } from "./models/user";
import activityRoutes from "./routes/activityRoutes";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import faqRoutes from "./routes/faqsRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import ordersRoutes from "./routes/ordersRoutes";
import profileRoutes from "./routes/profileRoutes";
import servicesRoutes from "./routes/servicesRoutes";
import accountRoutes from "./routes/userAccount";
import { UserRole, UserStatus } from "./types/enums";
import { logUserActivity } from "./utils/activityLogger";
import {
  checkPeakerBalanceCronJob,
  notificationCronJob,
  servicesCronJob,
} from "./utils/cron";

dotenv.config();

interface PassportUser {
  _id: string;
  name: string;
  email: string;
  photo: string;
}

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI as string;
const clientUrl = process.env.CLIENT_URL as string;

const app = express();

// Configure CORS BEFORE session/passport so preflight (OPTIONS) requests receive proper headers
// Normalize origins by removing trailing slashes
const allowedOrigins = [
  clientUrl?.replace(/\/$/, ""),
  "https://www.clouterahub.com",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin: any, callback: any) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Normalize the incoming origin by removing trailing slash
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // allow session cookies from the client
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
    }),
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: any,
    ) => {
      try {
        const passportUser: PassportUser = {
          _id: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          photo: profile.photos[0].value,
        };
        const { _id, email, name, photo } = passportUser;

        let user = await User.findOne({ googleId: _id });

        if (!user) {
          user = await User.findOne({ email });

          if (user) {
            user.googleId = _id;
            user.photo = photo;
            user.provider = "google";
            await user.save();
          } else {
            const names = name.split(" ");
            const firstName = names[0];
            const lastName = names.slice(1).join(" ");
            const username = name.replace(/\s/g, "").toLowerCase();

            user = new User({
              googleId: profile.id,
              firstName,
              lastName,
              username,
              email,
              photo,
              isVerified: true,
              role: UserRole.Customer,
              status: UserStatus.Active,
              provider: "google",
            });
            await user.save();
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use(express.json());

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req: Request, res: Response) => {
    const user = req?.user as IUser;

    const token = generateToken(user);

    await logUserActivity((user._id as string).toString(), "logged in.");
    res.redirect(`${clientUrl}/login?token=${token}`);
  },
);

app.get("/api/auth/user", (req: Request, res: Response) => {
  res.json(req.user || null);
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Database connected ✅");
    servicesCronJob();
    void notificationCronJob();
    void startOrderStatusCron();
    void checkPeakerBalanceCronJob();
  })
  .catch((error) => {
    console.log(`An error occurred 💥: ${error}`);
  });

app.listen(port, () => {
  console.log(`Listening on port ${port}/api`);
});
