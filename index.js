const axios = require("axios");
require("dotenv").config();

// Load environment variables from .env file
const EMAIL = process.env.EMAIL;
const OTP_CODE = process.env.OTP_CODE;

if (!EMAIL || !OTP_CODE) {
  console.error("Please set EMAIL and OTP_CODE in the .env file");
  process.exit(1);
}
