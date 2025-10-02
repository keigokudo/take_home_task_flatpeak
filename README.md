# Flatpeak Dashboard Login Script

A simple Node.js script that automates logging into the [Flatpeak demo dashboard](https://tazah1-dashboard.flatpeak.com) and retrieves auth-protected data, such as your API key or profile information, without using a headless browser.

## Features

- Request a one-time password (OTP) for login.
- Authenticate with OTP.
- Preserve session cookies automatically between requests.
- Access internal dashboard APIs to fetch protected data.
- Extract useful information, such as:

  - `account_id`
  - `test secret API key (sk_test_...)`

---

## Requirements

- Node.js >= 18
- NPM
- Packages:

  - [axios](https://www.npmjs.com/package/axios)
  - [axios-cookiejar-support](https://www.npmjs.com/package/axios-cookiejar-support)
  - [tough-cookie](https://www.npmjs.com/package/tough-cookie)
  - [prompt-sync](https://www.npmjs.com/package/prompt-sync)
  - [dotenv](https://www.npmjs.com/package/dotenv)

---

## Installation

1. Clone this repository:

```bash
git clone git@github.com:keigokudo/take_home_task_flatpeak.git
cd take_home_task_flatpeak
```

2. Install dependencies:

```bash
npm install
```

3. Configure your environment variables:

- Copy `.env_template` to `.env`

```bash
cp .env_template .env
```

- Set your email in `.env`:

```env
EMAIL=your_email@example.com
```

---

## Usage

1. Run the script:

```bash
node index.js
```

2. Check your email and type in the one-time password (OTP) when prompted.

3. The script will log into the dashboard, call the internal API, and output auth-protected data:

```
-----Below are the auth-protected data-----
account_id: acc_xxxxx
Test secret key: sk_test_xxxxx
```

---

## How it works

1. Sends a request to `auth.loginEmail` to generate an OTP.
2. Receives a `methodId` used for OTP authentication.
3. Posts OTP and `methodId` to `auth.authenticateOtp` to login.
4. Maintains the session using cookies via `axios-cookiejar-support` + `tough-cookie`.
5. Accesses an internal API endpoint (`user.current,keys.list`) to retrieve protected data.
6. Extracts `account_id` and the test secret key from the API response.

---

## Notes

- This approach does **not** require a headless browser and avoids the overhead of Puppeteer.
- Cookies are automatically handled between requests.
- The script can be extended to access other auth-protected endpoints in the dashboard.

---

## Limitations

Only users who have already created an account on the website can retrieve data from the page.
The script automates login and data retrieval but does not cover account creation.

---

## References

- [Axios Documentation](https://www.npmjs.com/package/axios#axios-api)
- [axios-cookiejar-support](https://www.npmjs.com/package/axios-cookiejar-support)
- [tough-cookie](https://www.npmjs.com/package/tough-cookie?activeTab=readme)
- [prompt-sync](https://www.npmjs.com/package/prompt-sync)
- [User-Agent header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/User-Agent)
