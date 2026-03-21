# API Performance & Optimization Report

## 1. Response Time Improvement with Caching (Before vs. After)
* **Before Caching (Baseline):** 2.11 ms average latency
* **After Caching:** 2.14 ms average latency
* **Analysis:** The response times are virtually identical and extremely low (~2ms). This indicates that the requests did not actually reach the cache or the database. Instead, they were intercepted early in the NestJS request lifecycle by the ThrottlerGuard (Rate Limiter), which immediately returned an error response.

## 2. Throughput (Requests/Sec) Comparison
* **Before Caching (Baseline):** 36,638 req/sec
* **After Caching:** 36,599 req/sec
* **Analysis:** The throughput remained consistently high across both tests. Because rate-limiting is a very lightweight operation (simply checking a counter and returning a 429 status code), the server was able to process over 36,000 requests per second without straining the underlying database.

## 3. Number of Requests that Hit Rate Limits
Because a strict rate limit was applied globally during the benchmark, the vast majority of requests were throttled.
* **Test 1 (No Cache applied):** 732,741 requests hit the rate limit (`non 2xx responses`). Only 30 requests succeeded.
* **Test 2 (Cache applied):** 731,936 requests hit the rate limit (`non 2xx responses`). Only 10 requests succeeded.

## 4. Which Endpoints Benefited Most from Caching and Why?
*(Theoretical Analysis based on Caching Principles)*

If the rate limiter were bypassed, the endpoints that would benefit the most from the `CacheInterceptor` are the **Read-Heavy Endpoints**, specifically:
* `GET /rooms` (Fetching all rooms)
* `GET /rooms/:id` (Fetching a specific room)

**Why?** These endpoints typically require querying the database (e.g., MySQL via Prisma), which involves disk I/O and network latency. By applying a cache, the first request fetches the data from the database and stores it in fast, in-memory storage (like RAM or Redis). Subsequent requests for the same data are served directly from memory, completely bypassing the database. This drastically reduces latency and increases throughput. 

Conversely, write-heavy endpoints (`POST /rooms`, `PATCH /rooms/:id`) do not benefit from caching and instead require cache invalidation to ensure users do not receive stale data.