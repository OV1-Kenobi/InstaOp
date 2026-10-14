import { WebSocket } from "ws";

export const AUTHORS = [
  "e1ff3bfdd4e40315959b08b4fcc8245eaa514637e1d4ec2ae166b743341be1af",
  "cc5f259f036683798e4a52071dbb97238702ffb6f0c85af6d273c8ddbe5c0afb",
  "7d4a4e87f28e0e3581d4aa923494dfb5bb428abdac20db79560e2bdec853bba8",
];

export const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.primal.net",
];

export const TX_RE = /https?:\/\/mempool\.space\/tx\/([0-9a-f]{64})/i;
const HEX_TX = /\b([0-9a-f]{64})\b/i;

export function parseEvent(event) {
  const pubkey = String(event.pubkey || "").toLowerCase();
  if (!event || Number(event.kind) !== 1 || !AUTHORS.includes(pubkey)) return null;
  const raw = String(event.content || "");
  if (!raw.trim()) return null;
  try {
    if (raw.trim().startsWith("{") && JSON.parse(raw)) return null;
  } catch {
    // keep
  }

  const txMatch = raw.match(TX_RE) || raw.match(HEX_TX);
  const txid = txMatch && txMatch[1].length === 64 ? txMatch[1].toLowerCase() : "";
  let message = raw.replace(TX_RE, "").replace(/^New OP_RETURN\s*/i, "").trim();
  message = message.replace(/\n{3,}/g, "\n\n");

  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: Number(event.created_at) || Math.floor(Date.now() / 1000),
    raw,
    message,
    txid,
  };
}

export function startIngest({ onEvent, since }) {
  const sockets = new Map();
  let connected = 0;
  let seen = 0;
  let accepted = 0;

  function open(url) {
    const ws = new WebSocket(url);
    sockets.set(url, { ws, ok: false });

    ws.on("open", () => {
      connected += 1;
      sockets.get(url).ok = true;
      const sub = `instaop-${Math.random().toString(16).slice(2)}`;
      const filter = { authors: AUTHORS, kinds: [1], limit: 50 };
      if (since) filter.since = Math.max(0, since - 120);
      ws.send(JSON.stringify(["REQ", sub, filter]));
    });

    ws.on("message", (buf) => {
      let payload;
      try {
        payload = JSON.parse(String(buf));
      } catch {
        return;
      }
      if (payload[0] !== "EVENT") return;
      seen += 1;
      const parsed = parseEvent(payload[2] || {});
      if (parsed) {
        accepted += 1;
        onEvent(parsed);
      }
    });

    ws.on("close", () => {
      if (sockets.get(url)?.ok) connected = Math.max(0, connected - 1);
      sockets.delete(url);
      setTimeout(() => open(url), 4000);
    });

    ws.on("error", () => ws.close());
  }

  RELAYS.forEach(open);

  return {
    connected() {
      return connected;
    },
    stats() {
      return { seen, accepted };
    },
    relays() {
      return RELAYS.map((url) => ({ url, open: Boolean(sockets.get(url)?.ok) }));
    },
  };
}

export async function lookupConfirmed(txid) {
  if (!txid || txid.length !== 64) return null;
  try {
    const res = await fetch(`https://mempool.space/api/tx/${txid}/status`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json.confirmed === "boolean") return json.confirmed;
  } catch {
    return null;
  }
  return null;
}
