# Design decisions and roadmap

Uptime and performance monitoring for APIs. Point it at your endpoints and it
tells you when they break, how often, and how slow they were getting beforehand.

This document records why the system is built the way it is, and what is worth
building next. The [README](README.md) covers what it does and how to run it.

## Architecture

| Component                  | Runs on        | Notes               |
| -------------------------- | -------------- | ------------------- |
| Dashboard and status pages | Vercel         | Next.js App Router  |
| API                        | Render         | Fastify             |
| Database                   | Neon           | Postgres via Prisma |
| Checks                     | GitHub Actions | Every 10 minutes    |

### The worker runs once and exits

It began as a `while (true)` loop with a sleep. It is now a script that performs
one pass and exits, with scheduling handled externally — GitHub Actions in
production, Docker Compose locally.

This is better for three reasons beyond hosting cost. Each run is independently
observable, with its own exit status and log. A crash cannot wedge a
long-running process into a half-dead state. And the same schedule that triggers
checks also warms the API, which solves the free-tier cold-start problem without
a second mechanism.

The trade-off is worth stating plainly: GitHub's scheduler is best-effort and
can run late under load. That is fine here. It would not be acceptable for a
monitoring product sold with an SLA.

### Incident detection is a pure function

Deciding whether an outage has begun is the logic most worth getting right, so
it is separated from persistence entirely. `decideIncidentAction` takes recent
checks and the current incident state and returns what should happen. It touches
no database, which means the awkward cases — flapping, backdating a start time,
a failure streak interrupted by one success — are cheap to test exhaustively.

The seed script replays generated checks through that same function, so demo
history and live history are produced by identical rules rather than by two
implementations that can drift apart.

Incidents are backdated to the first failure in a streak rather than the check
that crossed the threshold, so reported durations reflect the actual outage. The
threshold is configurable per endpoint, because one flaky endpoint should not
force everything else to be noisy.

### Alerts are tied to transitions, not to failures

Implemented and tested, but **not enabled in the deployed demo** — no mail
provider is configured, so the transport is null and alerting is skipped. The
design still shapes the incident model, so it is worth recording.

A four-hour outage sends two emails, not twenty-four. Alerts fire when an
incident opens or resolves, and sent-at timestamps on the incident make that
hold even if a run crashes partway through and the next run reconciles the same
incident again.

The timestamp is only written after a successful send, so a transient email
failure retries on the next run instead of being silently dropped. A failed send
is logged and swallowed rather than thrown, because one bounced email must not
stop the remaining endpoints being checked.

### Reads are public, writes are not

There are no user accounts. A single shared instance is enough for what this
does, and putting a signup wall in front of a status page defeats the purpose of
having one.

That applies to reading. Writing is gated by an admin token, because an open
write endpoint means anyone can point the polling worker at arbitrary URLs, fill
the database, publish a status page under any name, or redirect alert emails to
themselves. With no token configured the instance is read-only, so a deployment
that forgets to set one fails closed rather than open.

Monitored URLs are validated when created and resolved again immediately before
each fetch. The worker makes outbound requests from inside CI, so an unvalidated
URL is a server-side request forgery primitive — private, loopback and
link-local addresses are refused.

### Charts are aggregated by the API, not the browser

A month of ten-minute checks is about 4,300 rows per endpoint. Sending those to
the browser so it can reduce them to thirty points made the endpoint response
368 KB, and it grew with history rather than staying fixed.

The API now returns a bucketed series and a capped list of recent checks, which
holds the response at roughly 8 KB for any window. Buckets carry a start
timestamp rather than a formatted label, because formatting needs the viewer’s
locale and timezone and so has to happen client-side.

### History is pruned on every run, not nightly

A check row costs about 449 bytes including indexes, so five endpoints at
ten-minute polling grow by roughly 118 MB a year. That is years away from
filling a free Postgres tier, but it is unbounded, and it scales with the
number of endpoints rather than staying still.

The worker deletes anything older than the retention window — 90 days by
default, comfortably beyond the 30-day dashboard and status page views — on
every pass rather than in a nightly batch. At steady state each run removes
only the few rows that just aged out, so storage stays flat instead of
sawtoothing, and there is no schedule to miss, which matters when the cron
driving it is best-effort. An index on the timestamp keeps the delete an index
scan, so its cost does not grow with the table.

Incidents are deliberately never pruned. They are few, they are the part worth
keeping, and a status page that quietly forgets old outages is worse than one
that shows a long clean record.

### Checks run every ten minutes

Frequent enough that charts look alive, infrequent enough to stay inside free
tiers and to avoid rate-limiting the public APIs being monitored. Visual density
in the demo comes from seeded history rather than from polling aggressively.

## Built

- Endpoint CRUD, with per-endpoint failure thresholds and alert settings
- Polling worker recording checks with error-type classification
- Incidents: detection, resolution, duration, history, chart overlays
- Uptime and response time over a selectable 24h / 7d / 30d window
- Email alerts on incident open and close, deduplicated per incident (built,
  not enabled in the demo)
- Public read-only status pages with per-day uptime history
- Admin-token write access, and SSRF protection on monitored URLs
- Retention pruning, bounding storage growth
- Seeded demo data: 30 days across five endpoints
- CI running lint, typecheck, tests and both production builds

## Possible next

Roughly in order of value.

- **Turn alerting on.** The code is there; it needs a mail provider configured
  and a verified sender domain.
- **Webhook alerts** — Slack and Discord. Cheap now the alert model exists, and
  more useful than email to most teams.
- **Preview-deployment CORS** — origins are compared exactly, so Vercel preview
  domains cannot call the API. A pattern match would fix it.
- **Response assertions** — check body content or a JSON field, not just the
  status code. A 200 that returns an error payload currently counts as up.
- **Configurable per-endpoint intervals** — everything shares one schedule.

## Deliberately out of scope

- **Distributed multi-region checks.** Impressive, disproportionate effort, and
  it would change the deployment model entirely.
- **On-call scheduling and escalation policies.** That is a different product.
- **SMS alerts.** Ongoing per-message cost for no capability email lacks here.
