const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const prompt = require("prompt-sync")();
require("dotenv").config();

// Load environment variables
const EMAIL = process.env.EMAIL;

if (!EMAIL) {
  console.error("Please set EMAIL in the .env file");
  console.log("Create a .env file with:");
  console.log("EMAIL=your.email@example.com");
  process.exit(1);
}

// Configuration
const BASE_URL = "https://tazah1-dashboard.flatpeak.com";
const REQUEST_OTP_ENDPOINT = `${BASE_URL}/api/trpc/auth.loginEmail?batch=1`;
const LOGIN_ENDPOINT = `${BASE_URL}/api/trpc/auth.authenticateOtp?batch=1`;

// TRPC requires this values to be sent as a query parameter
// this is decode. It could be redundant but it is for the readability
const TRPC_INPUT = {
  0: { json: null, meta: { values: ["undefined"] } },
  1: { json: null, meta: { values: ["undefined"] } },
};
const encodedTrpcParam = encodeURIComponent(JSON.stringify(TRPC_INPUT));
const INTERNAL_API_ENDPOINT = `${BASE_URL}/api/trpc/user.current,keys.list?batch=1&input=${encodedTrpcParam}`;

// Setup cookie jar for session persistence
const jar = new CookieJar();
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

const client = wrapper(
  axios.create({
    baseURL: BASE_URL,
    timeout: 60000, // 60 seconds timeout
    withCredentials: true,
    jar,
    headers: {
      "User-Agent": userAgent,
      "Content-Type": "application/json",
    },
  })
);

/**
 * Request OTP code via email
 * @param {string} email - User's email address
 * @returns {Promise<string>} methodId - Unique identifier for this login attempt
 * @throws {Error} If request fails or methodId cannot be extracted
 */
async function requestOneTimePassword(email) {
  try {
    console.log("Requesting OTP...");
    const response = await client.post(REQUEST_OTP_ENDPOINT, {
      0: {
        json: {
          email: email,
        },
      },
    });

    console.log("OTP requested successfully.");
    const methodId = response.data[0]?.result.data.json.methodId;

    if (!methodId) {
      console.error("Failed to extract methodId from response");
      console.error("Response data:", JSON.stringify(response.data, null, 2));
      throw new Error("methodId not found in response");
    }

    return methodId;
  } catch (error) {
    console.error("OTP request failed:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });
    throw new Error(`OTP request failed: ${error.message}`);
  }
}

/**
 * Authenticate with OTP code and establish session
 * @param {string} methodId - Method ID from requestOneTimePassword
 * @param {string} otpCode - 6-digit OTP code from email
 * @throws {Error} If authentication fails
 */
async function authenticateOtp(methodId, otpCode) {
  try {
    console.log("Authenticating OTP...");
    await client.post(LOGIN_ENDPOINT, {
      0: { json: { code: otpCode, methodId: methodId } },
    });
    console.log("OTP authenticated successfully.");
  } catch (error) {
    console.error("OTP authentication failed:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });
    throw new Error(`OTP authentication failed: ${error.message}`);
  }
}

/**
 * Fetch protected data using authenticated session
 * @returns {Promise<Array>} Response data containing user info and API keys
 * @throws {Error} If request fails
 */
async function getInternalApiResponse() {
  try {
    console.log("Fetching API's response from the page...");
    const response = await client.get(INTERNAL_API_ENDPOINT);

    return response.data;
  } catch (error) {
    console.error("Fetch protected data failed:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });
    throw new Error(`Fetch protected data failed: ${error.message}`);
  }
}

/**
 * Extract account ID and test API key from response
 * @param {Array} response - API response array from getInternalApiResponse
 * @returns {Object} Object containing account_id and test_key
 * @throws {Error} If data cannot be extracted
 */
function extractAccountIdAndApiKey(response) {
  if (!Array.isArray(response) || response.length < 2) {
    throw new Error("Invalid response format");
  }

  console.log(
    "Subtracting an api key and account id from the protected page..."
  );

  // extract account_id from first object
  const account_id = response[0]?.result?.data?.json?.default_account_id;

  // extract the test key (judged by `live_mode: false`) from second object
  const keys = response[1]?.result?.data?.json || [];
  const test_key_obj = keys.find(
    (k) => k.key_type === "secret" && !k.live_mode
  );
  const test_key = test_key_obj?.key;

  return { account_id, test_key };
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log("Logging in...");

    // 1. Request OTP amd get methodId
    const methodId = await requestOneTimePassword(EMAIL);
    console.log("Received methodId:", methodId);

    // 2. Get OTP code from user
    console.info("Press Enter after you type the OTP from email.");
    const otpCode = prompt("One-time password:");
    console.log("Using OTP code:", otpCode);
    if (!otpCode) throw new Error("No OTP entered");

    // 3. Authenticate with OTP code (actual login)
    await authenticateOtp(methodId, otpCode);

    // 4. Fetch protected data
    const internalApiResponse = await getInternalApiResponse();

    // 5. Extract account_id and test_key
    const { account_id, test_key } =
      extractAccountIdAndApiKey(internalApiResponse);

    if (!account_id || !test_key) {
      console.error(
        "Failed to extract account_id or test_key or you may not have an account on the website"
      );
      console.error(
        "Response data:",
        JSON.stringify(internalApiResponse, null, 2)
      );
      throw new Error("account_id or test_key not found in response");
    }

    // 6. Display results
    console.log("-----Below are the auth-protected data-----");
    console.log("account_id:", account_id);
    console.log("Test secret key:", test_key);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
