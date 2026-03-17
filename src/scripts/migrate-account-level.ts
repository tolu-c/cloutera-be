/**
 * Migration: convert accountLevel from Number (1–5) to String ("LEVEL_1"–"LEVEL_5")
 *
 * The userAccount schema changed `accountLevel` from `type: Number` to
 * `type: String` with values matching the AccountLevel enum. This script
 * updates every document that still holds a numeric value.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI as string;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set");
  process.exit(1);
}

const levelMap: Record<number, string> = {
  1: "LEVEL_1",
  2: "LEVEL_2",
  3: "LEVEL_3",
  4: "LEVEL_4",
  5: "LEVEL_5",
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const collection = mongoose.connection.db!.collection("useraccounts");

  // Find documents where accountLevel is still stored as a number
  const docs = await collection
    .find({ accountLevel: { $type: "number" } })
    .toArray();

  console.log(`Found ${docs.length} document(s) to migrate`);

  let updated = 0;
  for (const doc of docs) {
    const numericLevel = doc.accountLevel as number;
    const stringLevel = levelMap[numericLevel];

    if (!stringLevel) {
      console.warn(
        `  Skipping _id=${doc._id}: unknown numeric level ${numericLevel}`,
      );
      continue;
    }

    await collection.updateOne(
      { _id: doc._id },
      { $set: { accountLevel: stringLevel } },
    );

    console.log(`  Migrated _id=${doc._id}: ${numericLevel} → "${stringLevel}"`);
    updated++;
  }

  console.log(`\nMigration complete: ${updated} document(s) updated`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
