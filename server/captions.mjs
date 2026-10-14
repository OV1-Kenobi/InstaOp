const TAGS = [
  { re: /bolt\s*12|lightning|lnurl|invoice|zap/i, tags: ["Lightning", "BOLT12"], note: "Lightning just got carved into the chain." },
  { re: /rust|🦀/i, tags: ["RustLang", "BitcoinDev"], note: "The crab has entered the blockchain." },
  { re: /birthday|bday|happy birthday/i, tags: ["BitcoinBirthday", "ForeverOnchain"], note: "Some people send cards. Others make them permanent." },
  { re: /love|heart|kiss|forever|wedding|marry/i, tags: ["Love", "ForeverOnchain"], note: "A feeling, settled in a block." },
  { re: /freedom|liberty|cypherpunk|free/i, tags: ["Freedom", "Cypherpunk"], note: "A horizon that cannot be taken down." },
  { re: /brc-?20|ordi|inscription|rune/i, tags: ["DigitalArtifacts", "BitcoinDev"], note: "Protocol graffiti, now a gallery piece." },
  { re: /\bgm\b|\bgn\b|lmao|lol|meme|joke/i, tags: ["BitcoinMemes", "OnchainArt"], note: "The mempool has a sense of humor." },
  { re: /sats|satoshi|bitcoin|btc|on.?chain|op_return/i, tags: ["Bitcoin", "OnchainArt"], note: "Paid the fee. Said the thing. Kept the receipt." },
  { re: /hello|welcome|world/i, tags: ["OnchainArt", "Bitcoin"], note: "A first word, written where it cannot fade." },
  { re: /build|dev|code|git|commit|ship/i, tags: ["BitcoinDev", "BuildOnBitcoin"], note: "Shipped where revert means another fee." },
];

const GENERIC_NOTES = [
  "The chain took a photograph of this sentence.",
  "A small act of permanence.",
  "Someone spent sats to make this unerasable.",
  "Not a tweet. A timestamp.",
];

export function inspectMessage(raw) {
  const text = String(raw || "");
  const printable = [...text].filter((ch) => {
    const code = ch.codePointAt(0);
    return code === 10 || code === 13 || (code >= 32 && code !== 127);
  }).join("");
  const ratio = text.length ? printable.length / text.length : 1;
  const isRaw = !text || ratio < 0.85;
  const message = isRaw
    ? hexPreview(text)
    : text;
  return {
    message,
    messageKind: isRaw ? "raw" : "text",
    bytes: Buffer.byteLength(text || "", "utf8"),
  };
}

export function composeVoice(message, kind, seed) {
  if (kind === "raw") {
    return {
      note: "Undecodable bytes. Shown as a raw preview, not a guessed sentence.",
      hashtags: ["OP_RETURN", "DigitalArtifacts"],
    };
  }

  const hits = TAGS.filter((row) => row.re.test(message));
  const tags = [];
  for (const hit of hits) {
    for (const tag of hit.tags) {
      if (!tags.includes(tag)) tags.push(tag);
    }
  }
  if (!tags.includes("OP_RETURN")) tags.unshift("OP_RETURN");
  if (tags.length < 2) tags.push("OnchainArt");

  const note = hits.length
    ? hits[0].note
    : GENERIC_NOTES[seed % GENERIC_NOTES.length];

  return {
    note,
    hashtags: tags.slice(0, 5),
  };
}

export function classifyArt(message, kind, seed) {
  if (kind === "raw") return "data";
  const t = message.toLowerCase();
  if (/love|heart|kiss|wedding|forever/.test(t)) return pick(seed, ["romance", "cinematic"]);
  if (/birthday|celebrate|congrats/.test(t)) return "celebration";
  if (/bolt|lightning|invoice|lnurl/.test(t)) return "lightning";
  if (/rust|🦀/.test(t)) return "rust";
  if (/freedom|liberty|horizon|sky/.test(t)) return "freedom";
  if (/brc|ordi|0x[0-9a-f]{8,}|[0-9a-f]{32,}/i.test(t)) return "data";
  if (/\bgm\b|\bgn\b|lmao|lol|meme/.test(t)) return "playful";
  if (/sats|bitcoin|btc|onchain/.test(t)) return pick(seed, ["bitcoin", "cinematic"]);
  if (message.trim().split(/\s+/).length <= 4) return pick(seed, ["type", "surreal"]);
  return ["surreal", "cinematic", "type", "playful"][seed % 4];
}

function pick(seed, items) {
  return items[seed % items.length];
}

function hexPreview(text) {
  const hex = Buffer.from(text, "utf8").toString("hex");
  return hex.slice(0, 96) + (hex.length > 96 ? "…" : "");
}

export function hashSeed(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
