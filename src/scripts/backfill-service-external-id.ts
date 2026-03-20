/**
 * Backfill: populate serviceExternalId on existing orders
 *
 * Orders that were created before serviceExternalId was added still have
 * only a MongoDB ObjectId ref in serviceId. This script looks up each
 * referenced Service document and copies its stable numeric serviceId
 * into serviceExternalId.
 *
 * Orders whose serviceId ObjectId no longer resolves (broken ref) are
 * skipped — they will continue showing serviceId: null in responses.
 *
 * Usage: npx tsx src/scripts/backfill-service-external-id.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI as string;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection not available");
    process.exit(1);
  }

  const ordersCol = db.collection("orders");
  const servicesCol = db.collection("services");

  // Find orders missing serviceExternalId
  const orders = await ordersCol
    .find({
      serviceExternalId: { $exists: false },
    })
    .project({ _id: 1, serviceId: 1 })
    .toArray();

  console.log(`Found ${orders.length} orders to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    if (!order.serviceId) {
      skipped++;
      continue;
    }

    const service = await servicesCol.findOne({
      _id: order.serviceId,
    });

    if (!service) {
      skipped++;
      continue;
    }

    await ordersCol.updateOne(
      { _id: order._id },
      { $set: { serviceExternalId: service.serviceId } },
    );
    updated++;
  }

  console.log(`Backfill complete: ${updated} updated, ${skipped} skipped`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
