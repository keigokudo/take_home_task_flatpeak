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
const baseUrl = "https://tazah1-dashboard.flatpeak.com";
const requestOtpEndpoint = `${baseUrl}/api/trpc/auth.loginEmail?batch=1`;
const loginEndpoint = `${baseUrl}/api/trpc/auth.authenticateOtp?batch=1`;

// TRPC requires these values to be sent as a query parameter
// this is decode. It could be redundant but it is for readability
const trpcInput = {
  0: { json: null, meta: { values: ["undefined"] } },
  1: { json: null, meta: { values: ["undefined"] } },
};
const encodedTrpcParam = encodeURIComponent(JSON.stringify(trpcInput));
const internalApiEndpoint = `${baseUrl}/api/trpc/user.current,keys.list?batch=1&input=${encodedTrpcParam}`;

// Setup cookie jar for session persistence
const jar = new CookieJar();
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

const client = wrapper(
  axios.create({
    baseURL: baseUrl,
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
    const response = await client.post(requestOtpEndpoint, {
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
    await client.post(loginEndpoint, {
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
    const response = await client.get(internalApiEndpoint);

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
 * Extract accountId and testKey from response
 * @param {Array} response - API response array from getInternalApiResponse
 * @returns {Object} Object containing accountId and testKey
 * @throws {Error} If data cannot be extracted
 */
function extractAccountIdAndApiKey(response) {
  if (!Array.isArray(response) || response.length < 2) {
    throw new Error("Invalid response format");
  }

  console.log(
    "Extracting an api key and account id from the protected page..."
  );

  // extract accountId from first object
  const accountId = response[0]?.result?.data?.json?.default_account_id;

  // extract the test key (judged by `live_mode: false`) from second object
  const keys = response[1]?.result?.data?.json || [];
  const testKeyObj = keys.find((k) => k.key_type === "secret" && !k.live_mode);
  const testKey = testKeyObj?.key;

  return { accountId, testKey };
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log("Logging in...");

    // 1. Request OTP and get methodId
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

    // 5. Extract accountId and testKey
    const { accountId, testKey } =
      extractAccountIdAndApiKey(internalApiResponse);

    if (!accountId || !testKey) {
      console.error(
        "Failed to extract accountId or testKey or you may not have an account on the website"
      );
      console.error(
        "Response data:",
        JSON.stringify(internalApiResponse, null, 2)
      );
      throw new Error("accountId or testKey not found in response");
    }

    // 6. Display results
    console.log("-----Below are the auth-protected data-----");
    console.log("Account id:", accountId);
    console.log("Test secret key:", testKey);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
