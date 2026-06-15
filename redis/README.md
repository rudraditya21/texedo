# Redis

Redis 7.2 (Alpine) — ephemeral in-process store for Texedo.

## Role in the stack

| Feature | Redis key pattern | TTL |
|---------|-------------------|-----|
| Rate limiting (LaTeX compile) | `rl:latex:<ip>` | 60 s sliding window |
| Compiled PDF cache | `pdf:<sha256(source)>` | 5 min |

Persistence is **disabled** intentionally — all cached data can be
reconstructed. If Redis restarts, rate-limit windows reset and PDF
compilations are triggered again on the next request.

## Configuration

All tunable values live in `redis.conf`. The defaults are sane for a
single-server self-hosted deployment:

- `maxmemory 256mb` — adjust up for larger workloads
- `maxmemory-policy allkeys-lru` — evicts the least-recently-used keys
  when the memory cap is hit

## Environment variables (consumed by the Next.js app)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Connection URL used by `lib/redis.ts` |
| `REDIS_PORT` | `6379` | Host port exposed by docker-compose |
