# Faculty of Information and Communication Technology <br/> ITCS258 Backend Application Development <br/> Caching and Rate Limiting

## Objectives

The objective of this lab is to:
- Implement Redis caching to improve API response times and reduce database load
- Configure and use rate limiting with NestJS Throttler to protect APIs from abuse
- Apply caching strategies to specific endpoints (Room API) and measure their effectiveness
- Use benchmarking tools to quantitatively measure performance improvements

## Exercise Tasks

### Task 1: Implement Redis caching for Room API

**Step 1.1:** Install required dependencies

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet redis
```

**Step 1.2:** Create and Start Redis using Docker

**Step 1.3:** Configure Redis cache in AppModule. The caching time will be 5 mins. 

**Step 1.4:** Apply caching to Room controller endpoints

**Step 1.5:** Verify Redis is caching data by checking Redis CLI.

**Step 1.6**: Test the caching behavior by making multiple requests to Room endpoints and observing the response time difference.

### Task 2: Implement rate limiting for Room endpoints

**Step 2.1:** Install throttler module

```bash
npm install @nestjs/throttler
```

**Step 2.2:** Configure ThrottlerModule globally. The global rate limiting will be 30 requests per minute.

**Step 2.3:** Apply custom rate limits to all room endpoints. The rate limiting will be 10 requests per minute.

**Step 2.4:** Test rate limiting by sending multiple rapid requests and observing the 429 Too Many Requests response.

### Task 3: Benchmark and measure performance improvements

**Step 3.1:** Install Autocannon for benchmarking

```bash
npm install -g autocannon
```

**Step 3.2:** Benchmark the Room API before optimization by temporarily disabling caching. Test with 100 concurrent connections for 20 seconds.

**Step 3.3:** Re-enable caching and benchmark again with the same setting

**Step 3.4:** Test rate limiting behavior for the Room API. Use any setting that causes your API to return `429 responses when limits are exceeded`.

**Step 3.5:** Document your findings in a brief report (.md file) including:

- Response time improvement with caching (before vs. after)
- Throughput (requests/sec) comparison
- Number of requests that hit rate limits
- Which endpoints benefited most from caching and why

## Submission

1. **Include a Generative AI usage declaration and reflection** at the beginning of your code file. Clearly state if AI tools were used and briefly reflect on your work.
2. **Push your code** to the provided GitHub Classroom repository for this assignment. Make sure all your code is committed and pushed before the submission deadline.
3. Submit the lab by the end of the next class session to the LAs. Late submissions may not be accepted.

## AI Usage Declaration and Reflection

Students must add an AI Declaration and Reflection of Today's Learning to the top of their code file.

A reflection is not a summary of what you did or what the AI generated.
Instead, it is a personal explanation of your learning process.

- If you used AI, focus on how AI impacted your learning or understanding of the code.
- If you did not use AI, focus on your learning, tools, and experience from the lab.

Here are examples:

### Example 1 – No AI Used

```tsx
/*
AI Declaration:
No Generative AI tools were used for this lab.
All code was written manually by the student.

Reflection:
[ Your Reflection goes here
Today’s lab helped me learn [key takeaway].
I practiced ...
]
*/

```

### Example 2 – AI Used for Reference

```tsx
/*
AI Declaration:
I used ChatGPT only to clarify HTML semantic tags.
No code was directly copied without modification.

Reflection:
[ Write 1–2 sentences reflecting on your learning or how AI impacted your understanding]
*/

```

### Example 3 – AI Assisted in Debugging

```tsx
/*
AI Declaration:
I used ChatGPT to help debug the table structure in my invoice layout.
I wrote all the other code, and I understand the entire implementation.

Reflection:
[ Write 1–2 sentences reflecting on your learning or how AI impacted your understanding ]
*/

```
