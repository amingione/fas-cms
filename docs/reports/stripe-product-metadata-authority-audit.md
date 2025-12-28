Here’s an audit-only diagnosis of the 401 on /api/vendor/login, based on codex.md and both repos.

Findings (ordered by impact)

Login is gated by portalAccess.enabled or status "approved", but the active setup flow never flips either. The UI posts to /api/vendor/auth/setup, which only writes portalAccess.passwordHash + setupCompletedAt, leaving portalAccess.enabled at its default false and status unchanged. That yields 401 even after successful setup. Evidence: SetupForm.tsx (line 54), setup.ts (line 59), login.ts (line 34), vendor.ts (line 433).
Status values don’t line up with the login check. Login expects "approved", but the vendor schema only allows active|inactive|pending|suspended|on_hold, and the invitation flow sets "Approved" (capitalized) which is off-schema. This makes the approved gate effectively false unless data is written off-schema. Evidence: login.ts (line 36), service.ts (line 131), vendor.ts (line 7).
There are two “portal enabled” fields, and login ignores the top-level one. If Studio users toggle vendor.portalEnabled (top-level), but vendor.portalAccess.enabled remains false (default), login will still 401. Evidence: login.ts (line 35), vendor.ts (line 395).
Vendor lookup is email-dependent and can fail silently. getVendorByEmail only checks portalAccess.email, primaryContact.email, or accountingContact.email. If portalAccess.email was never backfilled (it’s read-only), logging in with a “portal email” not matching those fields yields 401. Evidence: sanity-client.ts (line 53), vendor.ts (line 439), backfill-vendor-portal-email.ts (line 58).
Password hash storage is split. The auth setup writes portalAccess.passwordHash, but other flows write a top-level passwordHash that is not defined in schema. Login tries multiple locations, but data can end up in a non-schema field and still be relied upon, increasing mismatch risk. Evidence: setup.ts (line 59), sanity-client.ts (line 79), vendor.ts (line 465).
Most likely root cause for your 401
The setup flow currently used by the UI (/api/vendor/auth/setup) does not enable portal access or set a status that the login endpoint accepts. With portalAccess.enabled defaulting to false in the schema, login will return 401 even after setup unless that flag is manually set or status is forced to "approved".

If you can share the response JSON body from the 401 (the message field), I can pinpoint which branch is firing (portal access disabled vs account not set up yet vs invalid credentials).

headers repsonse on fasmotorsports.com

Request URL
https://www.fasmotorsports.com/vendor-portal
Request Method
GET
Status Code
302 Found
Remote Address
[2600:1f18:16e:df01::259]:443
Referrer Policy
strict-origin-when-cross-origin
age
0
cache-control
no-cache
cache-status
"Netlify Durable"; fwd=bypass
cache-status
"Netlify Edge"; fwd=miss
content-length
0
date
Sun, 28 Dec 2025 21:47:05 GMT
location
/vendor-portal/login
netlify-vary
query
server
Netlify
strict-transport-security
max-age=31536000
x-content-type-options
nosniff
x-nf-request-id
01KDKEVRYFCHEKZ83Q2NGRKTZZ
:authority
www.fasmotorsports.com
:method
GET
:path
/vendor-portal
:scheme
https
accept
text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,_/_;q=0.8,application/signed-exchange;v=b3;q=0.7
accept-encoding
gzip, deflate, br, zstd
accept-language
en-US,en;q=0.9
cookie
cookie-consent=1; \_ga_2FVKMPP1P8=GS2.1.s1762894383$o14$g0$t1762894383$j60$l0$h0; \_ga=GA1.1.1155734036.1760339619; \_ga_NQ94Z6HWGV=GS2.1.s1766956641$o126$g1$t1766958421$j60$l0$h687037827; \_gcl_au=1.1.1409532344.1763180510.640494111.1766956654.1766958422; fas_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxYTM4ZTY1Mi04MDc1LTQxNTctOWNkZi0xNDhmYTJiZWJlYWMiLCJlbWFpbCI6ImFtYmVybWluZ2lvbmVAZ21haWwuY29tIiwicm9sZXMiOlsidmVuZG9yIl0sImlhdCI6MTc2Njk1ODQyMywiZXhwIjoxNzY2OTYyMDIzfQ.Mmzw0wrr-Y4nTbiug90uM1VdlZ3OMt8UqtPSZKtlP0Y
priority
u=0, i
referer
https://www.fasmotorsports.com/vendor-portal/login
sec-ch-ua
"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
document
sec-fetch-mode
navigate
sec-fetch-site
same-origin
sec-fetch-user
?1
upgrade-insecure-requests
1
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36

headers response on localhost:4321

Request URL
http://localhost:4321/vendor-portal/login
Request Method
GET
Status Code
200 OK
Remote Address
[::1]:4321
Referrer Policy
strict-origin-when-cross-origin
HTTP/1.1 200 OK
Vary: Origin
content-type: text/html
Date: Sun, 28 Dec 2025 21:48:48 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked
GET /vendor-portal/login HTTP/1.1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,_/_;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
Cache-Control: no-cache
Connection: keep-alive
Cookie: cookie-consent=1; \_ga=GA1.1.962337967.1760140140; \_\_stripe_mid=fa902282-dcc6-4f3a-a1d4-dff7b7d25202fff5b9; \_gcl_au=1.1.563109725.1760517594; fas_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxYTM4ZTY1Mi04MDc1LTQxNTctOWNkZi0xNDhmYTJiZWJlYWMiLCJlbWFpbCI6ImFtYmVybWluZ2lvbmVAZ21haWwuY29tIiwicm9sZXMiOlsidmVuZG9yIl0sImlhdCI6MTc2Njk1ODI2MywiZXhwIjoxNzY2OTYxODYzfQ.y5AIGrlLs_ZqFzI7qlAk6q8c5Lr4mcyyLqJnxf5wSv8; \_ga_NQ94Z6HWGV=GS2.1.s1766956917$o43$g1$t1766958521$j60$l0$h252785747
Host: localhost:4321
Pragma: no-cache
Referer: http://localhost:4321/vendor-portal/login
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: same-origin
Sec-Fetch-User: ?1
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"

terminal log:

16:48:48 [200] /api/auth/session 1ms
vite:time 1.84ms /api/auth/session +2ms
vite:time 0.58ms /logo/faslogochroma.webp +187ms
vite:time 0.09ms /favicon.ico +3ms
vite:time 0.06ms /favicon.svg +2ms
vite:cache [memory] src/pages/api/vendor/login.ts +15s
16:49:03 [401] POST /api/vendor/login 247ms
vite:time 248.31ms /api/vendor/login +15s
16:49:03 [401] POST /api/vendor/login 247ms
vite:time 248.31ms /api/vendor/login +15s
vite:hmr [file change] docs/reports/stripe-product-metadata-authority-audit.md +2m
vite:hmr (client) [no modules matched] docs/reports/stripe-product-metadata-authority-audit.md +1ms
vite:hmr (ssr) [no modules matched] docs/reports/stripe-product-metadata-authority-audit.md +0ms
vite:hmr [file change] docs/reports/stripe-product-metadata-authority-audit.md +1m
vite:hmr (client) [no modules matched] docs/reports/stripe-product-metadata-authority-audit.md +0ms
vite:hmr (ssr) [no modules matched] docs/reports/stripe-product-metadata-authority-audit.md +0ms

console errors:

POST http://localhost:4321/api/vendor/login 401 (Unauthorized)
(anonymous) @ login.astro?astro&ty…&index=0&lang.ts:33
POST http://localhost:4321/api/vendor/login 401 (Unauthorized)
(anonymous) @ login.astro?astro&ty…&index=0&lang.ts:33
POST http://localhost:4321/api/vendor/login 401 (Unauthorized)
(anonymous) @ login.astro?astro&ty…&index=0&lang.ts:33
POST http://localhost:4321/api/vendor/login 401 (Unauthorized)
(anonymous) @ login.astro?astro&ty…&index=0&lang.ts:33
login.astro:173 POST http://localhost:4321/api/vendor/login 401 (Unauthorized)
(anonymous) @ login.astro:173

login:470 POST https://www.fasmotorsports.com/api/vendor/login 429 (Too Many Requests)
(anonymous) @ login:470
