# IPL Auction Arena — Deploy Guide

This is a small full-stack app now (not just a static file):
- `index.html` — the game UI
- `server.js` — a tiny Express backend that holds each room's live game
  state in memory and serves it over a simple REST API (`/api/room/:code`).
  This is what lets 4 different people on 4 different devices see the same
  auction in real time.

Because it needs one **always-running** server process (not a static site,
not a serverless function that resets between requests), the easiest free
host is **Render**, using its "Web Service" type. Vercel's default hosting is
serverless and would lose room state between requests, so it is **not** a
good fit here unless you also wire up an external database — skip it.

## Deploy on Render (recommended, free tier, ~3 minutes)

1. Put these files in a GitHub repo (create a new repo, e.g. `ipl-auction-arena`,
   and upload `index.html`, `server.js`, `package.json`, `package-lock.json`
   via the GitHub web UI: "Add file" → "Upload files").
2. Go to https://render.com → sign up / log in (free).
3. Click **New +** → **Web Service**.
4. Connect your GitHub account and select the `ipl-auction-arena` repo.
5. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
6. Click **Create Web Service**. Wait ~1–2 minutes for the first deploy.
7. Render gives you a URL like `https://ipl-auction-arena.onrender.com`.
   That's what you send to your 4 players — they all open the same URL.

Note: Render's free tier spins the server down after ~15 minutes of no
traffic and takes ~30–60s to wake back up on the next request. That's fine
for casual play — just have the host open the link a minute before everyone
joins. If that's annoying, Render's cheapest paid tier ($7/mo) keeps it
always-on, or Railway.app works the same way and has a similar free tier.

## Alternative: Railway (same idea, sometimes friendlier free tier)

1. Same repo as above.
2. https://railway.app → New Project → Deploy from GitHub repo.
3. Railway auto-detects Node, runs `npm install` and `npm start`.
4. It gives you a public URL under Settings → Networking → Generate Domain.

## Running it locally first (optional, to sanity-check before deploying)

```
npm install
npm start
```
Then open `http://localhost:3000` in a few browser tabs to test multiplayer
locally before you deploy.

## Notes

- All 4 players must open the **same deployed URL** — not separate copies
  of the file — since the shared room state lives on that one server.
- Room data lives in server memory only. If the server restarts (e.g. Render
  free tier spinning down, or a redeploy), in-progress rooms are lost. For a
  casual game with friends this is fine; if you want games to survive
  restarts, swap the in-memory `rooms` object in `server.js` for a small
  key-value store (e.g. Redis, or Render's own persistent disk + a JSON file).
- No login, API keys, or external accounts needed beyond your Render/Railway
  account.
