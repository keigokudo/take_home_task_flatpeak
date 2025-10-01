const axios = require("axios");
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
const LOGIN_ENDPOINT = `${BASE_URL}/api/trpc/auth.authenticateOtp?batch=1`;

const client = axios.create({
  baseURL: LOGIN_ENDPOINT,
  timeout: 60000, // 60 seconds timeout
  withCredentials: true, // to keep the jwt during the request
});
console.log("client", client);
