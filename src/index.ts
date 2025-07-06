import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoutes from "~/routes/authRoutes";

dotenv.config();

const app = express();

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI as string;

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Database connected ✅");
  })
  .catch((error) => {
    console.log(`An error occurred 💥: ${error}`);
  });

app.listen(port, () => {
  console.log(`Listening on port ${port}/api`);
});
