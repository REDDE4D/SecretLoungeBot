import { collectMetrics } from "./collect.js";

/**
 * Send metrics to the configured API endpoint
 * @param {Object} metrics - The metrics object to send
 * @param {string} apiUrl - The API endpoint URL
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function sendToApi(metrics, apiUrl, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metrics),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `Metrics API returned status ${response.status}: ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("Metrics API request timed out");
    } else {
      console.error("Error sending metrics to API:", error.message);
    }

    return false;
  }
}

/**
 * Send metrics with retry logic
 * @param {Object} metrics - The metrics object to send
 * @param {string} apiUrl - The API endpoint URL
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function sendWithRetry(metrics, apiUrl, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const success = await sendToApi(metrics, apiUrl);

    if (success) {
      return true;
    }

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
}

/**
 * Main function to collect and send metrics
 * Checks if metrics are enabled before proceeding
 * @returns {Promise<void>}
 */
export async function sendMetrics() {
  // Check if metrics are enabled
  const enabled = process.env.METRICS_ENABLED === "true";
  if (!enabled) {
    return;
  }

  // Get API URL from env or use default
  const apiUrl =
    process.env.METRICS_API_URL || "https://api.redde4d.it/metrics";

  try {
    const metrics = await collectMetrics();
    await sendWithRetry(metrics, apiUrl);
  } catch (error) {
    // Silent failure - log error but don't crash the bot
    console.error("Error in metrics collection/sending:", error);
  }
}
