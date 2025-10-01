const axios = require("axios");
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

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds timeout
  withCredentials: true, // to keep the jwt during the request
  headers: {
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  },
});

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
    console.log("ids::", methodId, otpCode);
    const response = await client.post(LOGIN_ENDPOINT, {
      0: { json: { code: otpCode, methodId: methodId } },
    });
    console.log("OTP authenticated successfully.");
    console.log("Full response:", response.data);
    return null;
  } catch (error) {
    console.error("Error response:", error);
  }
}

async function main() {
  console.log("Logging in...");
  const methodId = await requestOneTimePassword(EMAIL);
  console.log("Received methodId:", methodId);
  console.info("Press Enter after you type the OTP from email.");
  const otpCode = prompt("One-time password:");
  console.log("Using OTP code:", otpCode);
  const jwt = await authenticateOtp(methodId, otpCode);
}

main();
