# Note

## Analyze login

### Auth approach

1. request one time password via email
2. authenticate it with methodId and received code

Login is proceed by email and a one-time password. Not by email and user id.
The magic link comes from `login@test.stytch.com`.

At the login time.
Endpoint:
https://tazah1-dashboard.flatpeak.com/api/trpc/auth.authenticateOtp?batch=1

Payload structure:
{0: {json: {code: "000000", methodId: "email-test-some-hash"}}}

Auth method:
session jwt

session_jwt=jwt_token_hash

Decoded JWT:

```
{
  "aud": [
    "project-test-646a3368-97a0-4f10-889b-7ce0cce9ac85"
  ],
  "email": "user@example.com",
  "exp": 1759312000,
  "https://stytch.com/session": {
    "id": "session-test-[hash]",
    "started_at": "2025-10-01T09:41:40Z",
    "last_accessed_at": "2025-10-01T09:41:40Z",
    "expires_at": "2025-10-31T09:41:40Z",
    "attributes": {
      "user_agent": "",
      "ip_address": ""
    },
    "authentication_factors": [
      {
        "type": "otp", // one time password is used
        "delivery_method": "email",
        "last_authenticated_at": "2025-10-01T09:41:40Z",
        "email_factor": {
          "email_id": "email-test-[hash]",
          "email_address": "user@example.com"
        }
      }
    ]
  },
  "iat": 1759311700,
  "iss": "stytch.com/project-test-[hash]",
  "nbf": 1759311700,
  "reference_id": "user-test-[hash]",
  "sub": "user-test-[hash]"
}
```

### Learning

Stytch
https://stytch.com/

RPC/tRPC
https://trpc.io/

## Techs

### Axios vs node-fetch: Quick Decision for Task

For this login task, I’m going with Axios.
It’s feature-rich, handling JSON parsing and errors automatically, which saves time debugging the dashboard login. While node-fetch is lightweight and great for raw HTTP, it requires manual work for those features. The size difference is negligible, and Axios feels easier for scaling, even if this is a one-off script.

Axios vs. Fetch (2025 update): Which should you use for HTTP requests?
https://blog.logrocket.com/axios-vs-fetch-2025/

### Should I use TypeScript for this project?

No. Adding TypeScript might make a one-off script more complicated, especially when I'm short on time.

### OTP Handling Decision

For this implementation, the OTP code is passed as an environment variable
(`OTP_CODE=000000`) because the task focuses on HTTP authentication mechanics, not email automation.
And it is easier to test if it is passed through environmental variable. There is also a potential issue with fresh token etc.

## Stack

Analyze the auth method of the dash page.
Think about the architect of handing the OTP.
I tried to login on my terminal while it is already logged in on my browser.
Anti-bot from fly.io and need to set 'user-agent' to emulate a browser.

## scrape the page vs call that internal API endpoint?

jtw token it should be possible to get the response from the internal api.

## session_jtw

Will this be updated after OTP is submitted?
Without this it returns EPIPE or ECONNRESET error.
It looks the error comes from TCP layer, it even doesn't return status code.
So the request even doesn't reach to the application layer.
