const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const prompt = require("prompt-sync")();
require("dotenv").config();

// Load environment variables from .env file
const EMAIL = process.env.EMAIL;
const OTP_CODE = process.env.OTP_CODE;

if (!EMAIL || !OTP_CODE) {
  console.error("Please set EMAIL and OTP_CODE in the .env file");
  process.exit(1);
}

// Configuration
const BASE_URL = "https://tazah1-dashboard.flatpeak.com";
const REQUEST_OTP_ENDPOINT = `${BASE_URL}/api/trpc/auth.loginEmail?batch=1`;
const LOGIN_ENDPOINT = `${BASE_URL}/api/trpc/auth.authenticateOtp?batch=1`;

const TRPC_INPUT = {
  0: { json: null, meta: { values: ["undefined"] } },
  1: { json: null, meta: { values: ["undefined"] } },
};
// this could be redundant but it is for the readability
const encodedTrpcParam = encodeURIComponent(JSON.stringify(TRPC_INPUT));
const INTERNAL_API_ENDPOINT = `${BASE_URL}/api/trpc/user.current,keys.list?batch=1&input=${encodedTrpcParam}`;

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

// request one-time password and get methodId from the response
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

    return methodId;
  } catch (error) {
    if (error.response) {
      console.error("Error response:", error);
    }
  }
}

//  this posts methodId and otpCode to the login endpoint
async function authenticateOtp(methodId, otpCode) {
  try {
    console.log("Authenticating OTP...");
    await client.post(LOGIN_ENDPOINT, {
      0: { json: { code: otpCode, methodId: methodId } },
    });
    console.log("OTP authenticated successfully.");
    return null;
  } catch (error) {
    console.error("Error response:", error);
  }
}

async function getInternalApiResponse() {
  try {
    console.log("Fetching API's response from the page...");
    const response = await client.get(INTERNAL_API_ENDPOINT);

    return response.data;
  } catch (error) {
    console.error("Error fetching API:", error);
  }
}

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

async function main() {
  console.log("Logging in...");
  const methodId = await requestOneTimePassword(EMAIL);
  console.log("Received methodId:", methodId);
  console.info("Press Enter after you type the OTP from email.");
  const otpCode = prompt("One-time password:");
  console.log("Using OTP code:", otpCode);
  const jwt = await authenticateOtp(methodId, otpCode);

  const internalApiResponse = await getInternalApiResponse();
  const { account_id, test_key } =
    extractAccountIdAndApiKey(internalApiResponse);

  console.log("-----Below are the auth-protected data-----");
  console.log("account_id:", account_id);
  console.log("Test secret key:", test_key);
}

main();
