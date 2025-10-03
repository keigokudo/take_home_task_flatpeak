# Implementation Notes

_These notes document my implementation process, technical decisions, and lessons learned during the task._

## TL;DR

Key Implementation Decisions:

- TypeScript: Not used - unnecessary overhead for a simple demonstration script
- Unit Testing: Not implemented - considered out of scope for this task
- Data Retrieval: Direct internal API calls via tRPC endpoints (not web scraping)
- Session Management: tough-cookie + axios-cookiejar-support for automatic cookie handling
- OTP Input: Interactive CLI prompt - email automation is outside scope

## Authentication Flow Analysis

### Login Mechanism

The dashboard uses a passwordless authentication system powered by [Stytch](https://stytch.com/):

1. **Request OTP**: User submits email to receive a one-time password
2. **Authenticate**: Submit OTP code with `methodId` to establish session
3. **Session Management**: Authentication creates a JWT session token (`session_jwt`)

**Key Endpoints:**

- OTP Request: `POST /api/trpc/auth.loginEmail?batch=1`
- OTP Authentication: `POST /api/trpc/auth.authenticateOtp?batch=1`
- Protected Data: `GET /api/trpc/user.current,keys.list?batch=1`

**Authentication Method:**

- Session-based via JWT cookie
- OTP delivery from `login@test.stytch.com`
- No traditional password required

### tRPC Protocol

The dashboard uses [tRPC](https://trpc.io/) for type-safe API communication:

- Batch requests require specific query parameter encoding
- Payload structure: `{0: {json: {code: "...", methodId: "..."}}}`
- Input parameters must be URL-encoded JSON

### JWT Token Structure

The session JWT contains:

- User identification (`sub`, `reference_id`)
- Session metadata (started, accessed, expires timestamps)
- Authentication factors (confirms OTP via email)
- Expiry: 30 days from authentication

Sample decoded structure:

```json
{
  "aud": ["project-test-..."],
  "email": "user@example.com",
  "https://stytch.com/session": {
    "authentication_factors": [
      {
        "type": "otp",
        "delivery_method": "email"
      }
    ]
  }
}
```

## Technical Decisions

### HTTP Client: Axios vs node-fetch

**Decision: Axios**

**Rationale:**

- Automatic JSON parsing and error handling reduces debugging time
- Built-in interceptor support for complex auth flows
- Better cookie/session management out of the box
- Size difference negligible for this use case

While `node-fetch` is lighter and closer to browser Fetch API, Axios provides better DX for this authentication-heavy task without manual response parsing.

**Reference:** [Axios vs. Fetch (2025 update)](https://blog.logrocket.com/axios-vs-fetch-2025/)

### TypeScript: Not Used

**Decision: Plain JavaScript**

**Rationale:**

- Simple script doesn't justify TypeScript setup overhead
- Time-boxed task benefits from faster iteration
- Node.js with JSDoc provides sufficient type hints

For production systems, TypeScript would be preferred for type safety across API boundaries.

### OTP Input Method

**Decision: Interactive CLI prompt**

**Rationale:**

- Task focuses on HTTP mechanics, not email automation
- Interactive input demonstrates real-world UX
- Avoids complexity of email polling/IMAP integration
- Easier to test and demonstrate

**Alternative considered:** Environment variable (`OTP_CODE=000000`) - simpler for automated testing but less realistic for demo purposes.

### Unit Testing

**Decision: Not implemented**

**Rationale:**

- Out of scope for simple demonstration script
- Testing pure functions (`extractAccountIdAndApiKey`) would be valuable but:
  - Adds complexity to what should be a straightforward example
  - HTTP/auth flow testing requires extensive mocking (nock, msw)
  - Time better spent on core implementation quality

**If this were production code:**

- Unit tests for data extraction logic
- Integration tests with mocked HTTP responses
- Error handling scenarios (invalid OTP, expired sessions, etc.)

## Implementation Challenges

### Anti-Bot Protection

**Issue:** Initial requests were blocked by Fly.io's anti-bot system

**Solution:** Added browser-like User-Agent header:

```javascript
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...'
```

### Cookie Persistence

**Issue:** Session JWT must persist across requests

**Solution:** Used `axios-cookiejar-support` with `tough-cookie`:

- Automatic cookie storage and transmission
- Maintains session state throughout login flow
- Critical for accessing protected endpoints

### TCP-Level Errors

**Observation:** Requests without proper session cookies failed at TCP layer (EPIPE/ECONNRESET) before reaching application layer - no HTTP status codes returned.

**Insight:** Server appears to drop connections that don't present valid session cookies, likely as an anti-scraping measure.

## Architecture Decisions

### API vs Web Scraping

**Decision: Direct API calls**

**Rationale:**

- Authenticated session JWT provides API access
- Internal tRPC endpoints return structured JSON
- More reliable and performant than HTML parsing
- Aligns with task requirement: "raw HTTP requests"

The dashboard's internal APIs are well-structured and accessible once authenticated, making scraping unnecessary.

## Key Learnings

1. **Stytch Integration**: Modern passwordless auth is becoming standard
2. **tRPC Protocol**: Type-safe RPC requires understanding batch request structure
3. **Session Management**: JWT cookies are critical - even TCP layer enforces them
4. **Anti-Bot Measures**: User-Agent headers still matter in 2025
5. **API Discovery**: Browser DevTools Network tab remains the best API documentation
