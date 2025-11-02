import mongoose from "mongoose";
import "dotenv/config";
import logger from "../utils/logger.js";

export async function connectMongo() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DBNAME;

  // Validate required environment variables
  if (!uri) {
    throw new Error("❌ MONGO_URI environment variable is required. Please check your .env file.");
  }
  if (!dbName) {
    throw new Error("❌ DBNAME environment variable is required. Please check your .env file.");
  }

  await mongoose.connect(uri, { dbName });
  logger.info("Connected to MongoDB", { dbName });

  // Sync indexes to ensure sparse indexes are properly created
  // This fixes issues where old non-sparse indexes exist
  try {
    await mongoose.connection.syncIndexes();
    logger.info("Indexes synchronized successfully");
  } catch (err) {
    logger.error("Failed to sync indexes", { error: err.message });
    // Don't throw - let the app continue but log the error
  }
}
