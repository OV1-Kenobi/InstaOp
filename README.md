# InstaOp

An Instagram-style live gallery of Bitcoin [OP_RETURN](https://opreturnbot.com) messages.

The chain writes the caption. InstaOp turns each message into a square piece of artwork and a post.

## What it does

- Ingests public OP_RETURN Bot notes from Nostr
- Saves each event once and generates artwork asynchronously
- Shows the original on-chain text, a short note, and hashtags
- Serves a dark, mobile-first feed with stories, explore, and a reel viewer

Artwork is procedural SVG until an image provider is configured with `INSTAOP_IMAGE_PROVIDER` and a server-side key. Keys stay on the server, never in the browser.

## Run

```bash
npm install
INSTAOP_DATA=./data INSTAOP_BIND=127.0.0.1 INSTAOP_PORT=8788 npm start
```

Then open `http://127.0.0.1:8788/`.

Optional provider config can live in a local env file that you do not commit.
