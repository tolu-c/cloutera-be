import express, { Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";

import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import faqRoutes from "./routes/faqsRoutes";
import servicesRoutes from "./routes/servicesRoutes";
import ordersRoutes from "./routes/ordersRoutes";
import accountRoutes from "./routes/userAccount";
import { servicesCronJob } from "./utils/cron";

dotenv.config();

interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
}

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
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
      callbackURL: "/auth/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: any,
    ) => {
      const user: User = {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        photo: profile.photos[0].value,
      };
      return done(null, user);
    },
  ),
);

// passport.serializeUser(function(user: User, cb) {
//   process.nextTick(function() {
//     cb(null, { id: user.id, username: user.name, name: user.name });
//   });
// });

// passport.serializeUser((user: User, done) => {
//   done(null, user);
// });

// passport.serializeUser((user: User, done) => {
//   done(null, user);
// });

passport.deserializeUser((user: User, done) => {
  done(null, user);
});

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI as string;

app.use(express.json());
app.use(cors());

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req: Request, res: Response) => {
    res.redirect("http://localhost:3000/dashboard");
  },
);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/account", accountRoutes);

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Database connected ✅");
    servicesCronJob();
  })
  .catch((error) => {
    console.log(`An error occurred 💥: ${error}`);
  });

app.listen(port, () => {
  console.log(`Listening on port ${port}/api`);
});
