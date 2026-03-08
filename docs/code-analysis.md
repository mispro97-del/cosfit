# COSFIT Code Analysis Results

## Analysis Target
- **Path**: `src/app/(user)/`, `src/app/api/`, `src/lib/auth.ts`, `src/middleware.ts`
- **File count**: 46 files (`.ts` + `.tsx`)
- **Analysis date**: 2026-03-08

## Quality Score: 52/100

---

## Issues Found

### CRITICAL (Immediate Fix Required)

| # | File | Line | Issue | Recommended Action |
|---|------|------|-------|-------------------|
| C-01 | `src/app/(user)/onboarding/OnboardingWizard.tsx` | 81, 100, 123, 134, 148 | **Hardcoded `"current-user-id"` in all server action calls** -- Server actions receive a fake string instead of the actual authenticated user ID. All onboarding data is saved to a nonexistent user or fails silently. This is the single most critical bug in the project. | Retrieve `session.user.id` via `useSession()` (next-auth/react) and pass it to each action, or better yet, extract userId from the session inside the server action itself so the client cannot forge it. |
| C-02 | `src/app/(user)/onboarding/actions.ts` | 41, 90, 154, 178, 266 | **Server Actions accept `userId` as a client-supplied parameter** -- Any client can call `saveSkinProfile("any-user-id", ...)` to modify another user's data. This is an **authorization bypass (IDOR)**. | Server actions must obtain `userId` internally via `getServerSession(authOptions)` or `cookies()` + JWT verification. Remove `userId` from the function signature. |
| C-03 | `src/app/(user)/compare/actions.ts` | 104, 233, 279, 369 | **Same IDOR vulnerability** -- `fetchCompareResult`, `fetchCompareHistory`, `runCompareAnalysis`, `deleteCompareResult` all accept `userId` from the client. | Same fix as C-02. |
| C-04 | `src/app/(user)/shop/actions.ts` | 95, 122, 149, 167, 179, 283, 310 | **Same IDOR vulnerability** in all cart/checkout/order actions. Additionally, `checkout()` deducts inventory and creates orders using an attacker-supplied userId. | Same fix as C-02. |
| C-05 | `src/app/api/v1/compare/route.ts` | 14, 17-19 | **API uses `x-user-id` header for auth (spoofable) + TODO mock data** -- The compare API reads `x-user-id` from a request header (not from JWT), and then uses mock data instead of real DB queries. This endpoint is effectively broken and insecure. | Use `getToken()` for authentication. Implement actual DB lookups. |
| C-06 | `src/app/api/v1/payment/route.ts` | 46 | **Payment request accepts `userId` from request body** -- `handlePaymentRequest` trusts client-supplied `userId` for order ownership verification. An attacker can confirm/cancel other users' payments. | Extract userId from JWT token. |
| C-07 | `src/app/api/v1/payment/route.ts` | 96-148 | **PG confirm handler has no request authentication** -- `handlePaymentConfirm` does not verify the caller's identity. Any unauthenticated request with a valid `paymentKey` can confirm a payment. | Add webhook signature verification or at minimum require authentication. |
| C-08 | `src/app/api/v1/payment/route.ts` | 152-174 | **Payment cancel does not verify PG response** -- After calling `fetch(cancel)`, the response is not checked (`pgConfirm.ok`). If PG cancel fails, local DB still marks it as `REFUNDED`. | Check PG response status before updating local DB. |
| C-09 | `src/app/api/auth/signup/route.ts` | 13, 22 | **Role injection on signup** -- Client can send `role: "PARTNER"` in the signup body and get partner privileges immediately, bypassing any verification process. | Remove `role` from client input or restrict to `"USER"` only. Partner role should be assigned via admin approval. |
| C-10 | `src/middleware.ts` | 30, 61 | **`/api/v1/products/search` is public but `/api/v1/products` requires auth** -- Inconsistent. The search endpoint is in PUBLIC_PATHS but the products list endpoint requires authentication, creating confusion and potential access issues. PUBLIC_PATHS prefix matching means `/api/auth/anything` is also public. | Review and explicitly list all intended public paths. Consider using exact match instead of `startsWith` for sensitive paths. |
| C-11 | `src/lib/auth.ts` | 91-107 | **JWT callback queries DB on every request** -- When `token.id` exists and `user` is falsy (i.e., every subsequent request after login), the callback runs `prisma.user.findUnique()`. This is a **DB query on every authenticated request**, creating massive load under scale. | Cache role/onboardingStatus in the JWT itself and only refresh periodically (e.g., every 5 minutes) or on explicit session refresh. |

### WARNING (Improvement Recommended)

| # | File | Line | Issue | Recommended Action |
|---|------|------|-------|-------------------|
| W-01 | `src/app/(user)/compare/[id]/CompareReportClient.tsx` | 41-91, 168 | **Entire component uses hardcoded MOCK data** -- `const r = MOCK;` ignores the `compareId` prop entirely. The report page never shows real data. | Wire up to `fetchCompareResult` server action or pass data from server component. |
| W-02 | `src/app/(user)/history/HistoryClient.tsx` | 36-43, 54 | **Falls back to MOCK data** -- `const data = items ?? MOCK_HISTORY;` and the parent `page.tsx` passes no items (DB fetch is commented out). | Uncomment DB fetch in `page.tsx` and pass real data. |
| W-03 | `src/app/(user)/shop/cart/page.tsx` | 26-30 | **Cart page uses local mock state** -- `INITIAL_CART` is hardcoded. No integration with `fetchCart` server action. Cart changes are lost on refresh. | Integrate with `fetchCart`/`addToCart`/`removeFromCart` server actions. |
| W-04 | `src/app/(user)/shop/checkout/page.tsx` | 38-41, 77 | **Checkout page uses hardcoded CART and mock payment** -- `setTimeout(() => setStep("done"), 2000)` fakes payment success. Never calls actual checkout action. | Wire up to `checkout()` server action and PG redirect flow. |
| W-05 | `src/app/(user)/shop/orders/page.tsx` | 22-38 | **Orders page uses hardcoded mock data** -- No integration with `fetchOrders`. | Connect to server actions. |
| W-06 | `src/app/(user)/onboarding/steps/CompletionScreen.tsx` | 110 | **"Start exploring" button has empty onClick** -- `onClick={() => {/* navigate to home */}}`. User is stuck on completion screen with no way to proceed. | Add `router.push("/")` or `router.push("/history")`. |
| W-07 | `src/app/(user)/onboarding/OnboardingWizard.tsx` | 80-90 | **Error from saveSkinProfile is silently ignored** -- If `result.success` is false, no error message is shown to the user. | Display error state to user via toast or alert. |
| W-08 | `src/app/(user)/onboarding/OnboardingWizard.tsx` | 122-129 | **registerHolyGrailProduct error is silently ignored** -- Optimistic UI update adds product locally but server error goes unnoticed. If server fails, local state diverges from DB. | Show error and revert local state on failure. |
| W-09 | `src/middleware.ts` | 34-47 | **In-memory rate limiter leaks memory** -- `rlStore` Map grows indefinitely. Old entries are overwritten only when the same key is reused. Different user+path combinations accumulate forever. | Add periodic cleanup (e.g., `setInterval` or use an LRU cache). In production, use Redis. |
| W-10 | `src/middleware.ts` | 34-47 | **Rate limiter is per-instance** -- In multi-instance deployments (App Runner scales horizontally), each instance has its own `rlStore`. Rate limits are not enforced globally. | Use Redis or an external rate limiting service. |
| W-11 | `src/middleware.ts` | 122-123 | **User ID and role exposed via response headers** -- `x-cosfit-user-id` and `x-cosfit-user-role` are sent to the client in every response. This leaks internal user identifiers. | Remove these headers or restrict them to internal API calls only. |
| W-12 | `src/app/api/v1/admin/sync/route.ts` | 13-23 | **Global mutable state in module scope** -- `currentSync` is module-level mutable state. In serverless/multi-instance environments this is unreliable. | Use Redis or database for job state tracking. |
| W-13 | `src/app/(user)/onboarding/actions.ts` | 52 | **`sensitivityLevel` of 0 is treated as falsy** -- `if (!input.sensitivityLevel ...)` would reject `sensitivityLevel: 0` if it were a valid value. Currently range is 1-5 so it's not triggered, but fragile. | Use explicit check: `input.sensitivityLevel === undefined \|\| input.sensitivityLevel === null`. |
| W-14 | `src/app/(user)/onboarding/actions.ts` | 99-107 | **Duplicate detection with OR condition is too broad** -- If `product.productId` is undefined, the query becomes `OR: [{ productId: undefined }, { customName: "..." }]` which may match unintended records. | Only include non-null conditions in the OR clause. |
| W-15 | `src/app/(user)/shop/actions.ts` | 86-91 | **Order number collision risk** -- `generateOrderNumber()` uses `Math.random()` for 5 digits (99,999 possibilities per day). At scale, collisions are likely. | Use UUID or database sequence. Add unique constraint retry logic. |
| W-16 | `src/app/(user)/shop/actions.ts` | 329-368 | **Excessive `as any` casting** -- `fetchOrderDetail` casts every field through `(order as any)`, defeating TypeScript's type safety entirely (20+ casts in one function). | Properly type the Prisma query result or use a type-safe mapping function. |
| W-17 | `src/lib/auth.ts` | 70-88 | **OAuth signIn callback does not set onboardingStatus on JWT** -- When a new user signs up via Google/Kakao, `onboardingStatus` is set to `"PENDING"` in DB but the JWT callback only reads it on subsequent requests. The first session after OAuth signup may have stale token data. | After creating the user in the signIn callback, ensure the jwt callback picks up the fresh data on the same request. |
| W-18 | `src/app/(user)/compare/[id]/page.tsx` | 18-38 | **Server component passes compareId to client but no data** -- The commented-out code shows the intended pattern (fetch on server, pass data). Currently the client component ignores compareId and shows mock. | Implement the commented-out server-side fetch. |
| W-19 | `src/app/api/v1/products/[id]/route.ts` | 12 | **Next.js 14 params should be awaited** -- In Next.js 14 App Router, `params` in route handlers may need to be awaited depending on the version. This could cause runtime errors. | Verify against the exact Next.js version in use. Use `const { id } = await params;` if needed. |

### INFO (Reference)

| # | Observation |
|---|-------------|
| I-01 | **Consistent error handling pattern** -- All server actions use try/catch with `ActionResult<T>` return type. API routes use `successResponse`/`errorResponse` helpers. Good foundation. |
| I-02 | **Good API response format standardization** -- `src/lib/api/response.ts` enforces `{ success, data, error, meta }` structure with `ERROR_CODES` constants. |
| I-03 | **Proper bcrypt usage** -- Password hashing uses `bcrypt.hash(password, 12)` with a good salt round. |
| I-04 | **Pagination is well-implemented** -- Both server actions and API routes support `page`/`limit` with proper bounds (`Math.min`, `Math.max`). |
| I-05 | **RBAC middleware is well-structured** -- Route rules are declarative and easy to extend. Role-based access control covers user/partner/admin paths. |
| I-06 | **UI components are visually complete** -- Onboarding wizard, compare report, history list, cart, checkout, and orders all have polished UI. The gap is purely in data integration. |
| I-07 | **No test coverage for API routes or server actions** -- Only `fit-score-v3.test.ts` and `analysis.test.ts` exist. Zero tests for auth, middleware, or any API endpoint. |
| I-08 | **TypeScript `as any` usage is pervasive** -- Found in 30+ locations across server actions and API routes. This undermines type safety. |
| I-09 | **Duplicate code: GRADE_CONFIG, CAT_EMOJI** -- Defined independently in `CompareReportClient.tsx`, `HistoryClient.tsx`, `cart/page.tsx`, `checkout/page.tsx`, and `orders/page.tsx`. Should be extracted to a shared constants file. |
| I-10 | **No `.env.example` file found** -- Environment variables (`NEXTAUTH_SECRET`, `TOSS_SECRET_KEY`, `BASE_URL`, etc.) are referenced but no template exists for new developers. |

---

## Detailed Analysis by Category

### 1. Routing & Navigation Bugs

**Login redirect flow**: Working correctly. Middleware captures `callbackUrl` and redirects to `/login`. After login, `router.push(callbackUrl)` handles the return. However, the login page defaults `callbackUrl` to `"/"` which means a user who hits `/onboarding` directly will be redirected to `/login` and after login will go to `/` instead of `/onboarding` -- this is actually correct since the middleware does set `callbackUrl` to `pathname`.

**Onboarding completion flow**: BROKEN. After onboarding completes, `CompletionScreen` has an empty `onClick` handler (W-06). The user cannot navigate away from the completion screen without manually typing a URL.

**Session-less access**: The middleware correctly blocks all `(user)` group pages for unauthenticated users (line 20: pattern matches `/onboarding|my-products|analysis|compare|history|profile`). However, `/shop` routes require the pattern `/shop/` (with trailing slash), meaning `/shop` alone might bypass the rule. Currently there is no `/shop` page (only `/shop/cart`, `/shop/checkout`, `/shop/orders`), so this is not exploitable.

### 2. Authentication & Security

**IDOR is the dominant vulnerability.** Every server action in the project accepts `userId` as a function parameter from the client. This is a textbook Insecure Direct Object Reference. The middleware correctly authenticates users, but server actions bypass this entirely by trusting client input.

**Signup role injection** (C-09) allows anyone to register as PARTNER, gaining access to partner dashboard and analytics.

**Payment webhook** (C-07) has no signature verification. In production with Toss Payments, this means anyone who guesses a `paymentKey` can confirm arbitrary payments.

### 3. Data Integration Status

| Component | Data Source | Status |
|-----------|------------|--------|
| Onboarding Wizard | Server Actions | Calls actions but with fake userId |
| Compare Report | Server Action (commented out) | **100% MOCK** |
| History List | Server Action (commented out) | **100% MOCK** |
| Cart Page | Local state only | **100% MOCK** |
| Checkout Page | Local state + setTimeout | **100% MOCK** |
| Orders Page | Local state only | **100% MOCK** |
| Product Search API | Prisma | **Working** |
| Product Detail API | Prisma | **Working** |
| Reviews API | Prisma + JWT auth | **Working** |
| Compare History API | Prisma + JWT auth | **Working** |
| Partner Stats API | Prisma + JWT auth | **Working** |

**Conclusion**: The backend APIs are largely functional, but the frontend pages (except onboarding) are disconnected from them.

### 4. Performance

- **C-11**: JWT callback queries DB every request. At 1000 concurrent users, this is 1000 extra DB queries per page load.
- **W-09**: Rate limiter Map grows unbounded.
- **N+1 in `fetchCompareResult`**: Line 129-138 fetches all holyGrailProducts with nested product.ingredients. This is a single Prisma query with includes, so Prisma handles it as JOINs -- acceptable.
- **Partner stats API** (line 65-78): Fetches all `compareResult` rows for a partner's products in one query. No pagination. Could be slow for popular partners with thousands of comparisons.

### 5. Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Server Actions for mutations | PARTIAL | Actions exist but accept untrusted userId |
| API routes for external/partner access | OK | Proper REST endpoints with auth |
| Clean error responses | OK | Consistent `{ success, error: { code, message } }` |
| Middleware RBAC | OK | Well-structured route rules |
| Type definitions | WEAK | Heavy `as any` usage defeats TypeScript benefits |
| Separation of concerns | OK | Actions/API/lib layers exist |

---

## Priority Fix Order

### Phase 1: Security (Estimated: 1-2 days)
1. **Fix IDOR in all server actions** (C-02, C-03, C-04) -- Replace `userId` parameter with `getServerSession(authOptions)` inside each action
2. **Fix IDOR in payment API** (C-06, C-07) -- Add JWT auth and PG webhook signature verification
3. **Remove role from signup** (C-09) -- Hardcode to `"USER"`
4. **Remove user info from response headers** (W-11)

### Phase 2: Data Integration (Estimated: 3-5 days)
1. **Replace `"current-user-id"` with real session** (C-01) -- Add `useSession()` to OnboardingWizard
2. **Wire up Compare Report** (W-01) -- Uncomment server fetch in page.tsx
3. **Wire up History** (W-02) -- Same pattern
4. **Wire up Cart/Checkout/Orders** (W-03, W-04, W-05) -- Replace mock data with server actions
5. **Fix CompletionScreen navigation** (W-06)

### Phase 3: Robustness (Estimated: 2-3 days)
1. **Add error display in OnboardingWizard** (W-07, W-08)
2. **Fix JWT callback performance** (C-11) -- Add TTL-based caching
3. **Fix rate limiter memory leak** (W-09)
4. **Fix payment cancel error handling** (C-08)
5. **Reduce `as any` usage** (W-16)

### Phase 4: Quality (Ongoing)
1. Extract shared constants (GRADE_CONFIG, CAT_EMOJI) (I-09)
2. Add `.env.example` (I-10)
3. Add API route tests (I-07)
4. Add integration tests for server actions

---

## Deployment Verdict

**DEPLOYMENT BLOCKED** -- 11 critical issues found, 9 of which are security vulnerabilities (IDOR, role injection, payment auth bypass). The application must not be exposed to real users until Phase 1 security fixes are complete.
