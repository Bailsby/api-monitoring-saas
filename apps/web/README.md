# Dashboard and status pages

The Next.js front end for API Monitor. See the [project README](../../README.md)
for what the product does and how to deploy it.

Two distinct surfaces live here, and the difference between them shapes the
code:

| Route                       | Audience                           | Rendering                              |
| --------------------------- | ---------------------------------- | -------------------------------------- |
| `/`, `/endpoints/[id]`      | Whoever operates the monitoring    | Client-side, fetched from the browser  |
| `/status`, `/status/[slug]` | Customers of the monitored service | Server-rendered, fetched on the server |

Dashboard pages sit in the `(dashboard)` route group so they can share the
navigation chrome without imposing it on the status pages, which deliberately
render bare. Status pages are server-rendered so they are shareable and carry
real page metadata.

## Running it

Normally you want the whole stack, from the repository root:

```bash
docker compose up
```

- Dashboard — http://localhost:3001
- Status pages — http://localhost:3001/status

To run just this app against an API that is already up:

```bash
npm install
npm run dev
```

## Environment

| Variable              | Used by     | Notes                                                      |
| --------------------- | ----------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | The browser | Dashboard fetches                                          |
| `API_INTERNAL_URL`    | The server  | Status page rendering; falls back to `NEXT_PUBLIC_API_URL` |

Both point at the same place in production. They differ only under Docker,
where `localhost` from inside the web container is not the API container — hence
the split.

## Checks

```bash
npm run lint
npm run build
```

Both run in CI on every push.

> This targets Next.js 16, which changed enough that older App Router advice
> can be actively wrong. The version-matched docs ship in the package:
> `node_modules/next/dist/docs/`.
