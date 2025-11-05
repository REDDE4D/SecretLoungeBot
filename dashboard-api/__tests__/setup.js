import dotenv from "dotenv";
import { connectDatabase, disconnectDatabase } from "../config/database.js";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Setup function to run before all tests
export async function setupTests() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error("Failed to connect to test database:", error);
    throw error;
  }
}

// Teardown function to run after all tests
export async function teardownTests() {
  try {
    await disconnectDatabase();
  } catch (error) {
    console.error("Failed to disconnect from test database:", error);
    throw error;
  }
}

// Jest global setup
beforeAll(async () => {
  await setupTests();
});

// Jest global teardown
afterAll(async () => {
  await teardownTests();
});
