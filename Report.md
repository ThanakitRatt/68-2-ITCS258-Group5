# API Performance & Optimization Report

## 1. Response Time Improvement with Caching (Before vs. After)
* **Before Caching (Baseline):** 6.08 ms average latency
* **After Caching:** 14.46 ms average latency
* **Result:** Introducing the cache **increased** average latency by approximately 137%. 

## 2. Throughput (Requests/Sec) Comparison
* **Before Caching (Baseline):** 15,247 requests/sec (Total: 305,000 requests)
* **After Caching:** 6,711 requests/sec (Total: 134,000 requests)
* **Result:** Introducing the cache **decreased** throughput by roughly 56%.

## 3. Number of Requests that Hit Rate Limits
* **Before Caching:** 0 rate limit hits (100% successful requests)
* **After Caching:** 0 rate limit hits (100% successful requests)
* *Note: The global rate limit was bypassed for this benchmark to measure true database and cache performance.*

## 4. Analysis: Why Did Caching Make the API Slower?
Counterintuitively, the `CacheInterceptor` degraded performance. In our environment, the local MySQL database (via Prisma) is highly optimized and returns simple queries in roughly ~6ms. When we introduced caching, we encountered **Cache Overhead**, which was caused by:

1. **Serialization/Deserialization Tax:** NestJS's `CacheInterceptor` must serialize JavaScript objects into JSON strings to store them, and parse them back out on every request. For very fast, simple database queries, the CPU time spent stringifying and parsing data in Node.js's single thread takes longer than just asking the database for the data.
2. **Event Loop Blocking:** Under high concurrency (100 simultaneous connections hitting the server 15,000+ times a second), Node.js gets bogged down managing the in-memory cache operations, creating a bottleneck that outpaces the raw speed of a local database connection pool. 

**Conclusion for Endpoints:** While read-heavy endpoints (like `GET /rooms`) *theoretically* benefit from caching, this benchmark proves that **you should not cache data that is already extremely fast to retrieve**. Caching should be reserved for complex queries (e.g., joining multiple tables, heavy calculations) or slow external APIs where the database lookup takes significantly longer than the cache's serialization overhead.