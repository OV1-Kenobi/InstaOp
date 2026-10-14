const PEOPLE = [
  { user: "thrillerx_", name: "ThrillerX", city: "Austin, Texas", reason: "Followed by gabeorange_ + 4 more" },
  { user: "gabeorange_", name: "Gabe", city: "Georgia Tech", reason: "Followed by thrillerx_" },
  { user: "kylosats", name: "Kylo", city: "Miami", reason: "Suggested for you" },
  { user: "mempoolgirl", name: "Mina", city: "Lisbon", reason: "Followed by blockspace" },
  { user: "blockspace", name: "Blockspace", city: "New York", reason: "Followed by satoshi.stack" },
  { user: "satoshi.stack", name: "Ada", city: "Helsinki", reason: "Popular" },
  { user: "orange.pill", name: "Pia", city: "Berlin", reason: "Followed by lightning.liz" },
  { user: "lightning.liz", name: "Liz", city: "Oslo", reason: "Followed by you" },
  { user: "taproot.tom", name: "Tom", city: "Singapore", reason: "New to InstaOp" },
  { user: "utxo.nina", name: "Nina", city: "Toronto", reason: "Followed by hodlclub" },
  { user: "hodlclub", name: "Hodl Club", city: "Prague", reason: "Suggested for you" },
  { user: "afkarbara", name: "Ara", city: "Lagos", reason: "Followed by thrillerx_" },
];

const COMMENT_BITS = [
  "this goes hard",
  "forever on-chain 🔥",
  "need this as a print",
  "the artwork ate",
  "who settled this??",
  "bitcoin did that",
  "gallery piece",
  "insane caption",
  "more of this",
  "timestamped forever",
];

const posts = new Map();
const liked = new Set();
let liveFollow = true;
let waiting = 0;
let storyIndex = 0;
let storyTimer = null;
let userPinned = false;
let filterTag = "";
let filterQuery = "";

const feedEl = document.getElementById("feed");
const storiesEl = document.getElementById("stories");
const liveBadge = document.getElementById("live-badge");
const newPill = document.getElementById("new-pill");
const searchView = document.getElementById("search-view");
const profileView = document.getElementById("profile-view");
const messagesView = document.getElementById("messages-view");
const searchInput = document.getElementById("search-input");
const searchGrid = document.getElementById("search-grid");
const profileGrid = document.getElementById("profile-grid");
const viewer = document.getElementById("story-viewer");

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function person(seed, offset = 0) {
  return PEOPLE[(hash(seed) + offset) % PEOPLE.length];
}

function avatar(user) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(user)}`;
}

function social(post) {
  const n = hash(post.id);
  const author = person(post.id, 0);
  const liker = person(post.id, 2);
  const other = person(post.id, 5);
  return {
    author,
    liker,
    likes: 18 + (n % 4280),
    comments: 1 + (n % 184),
    lines: [0, 1].map((i) => ({
      user: person(post.id, 3 + i).user,
      text: COMMENT_BITS[(n + i) % COMMENT_BITS.length],
    })),
    other,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sorted() {
  return [...posts.values()].sort((a, b) => b.created_at - a.created_at);
}

function filtered() {
  return sorted().filter((post) => {
    if (filterTag && !(post.hashtags || []).some((tag) => tag.toLowerCase() === filterTag.toLowerCase())) return false;
    if (filterQuery && !`${post.message} ${post.note}`.toLowerCase().includes(filterQuery)) return false;
    return true;
  });
}

function timeAgo(ts) {
  const delta = Math.max(1, Math.floor(Date.now() / 1000) - ts);
  if (delta < 60) return `${delta}s`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  if (delta < 604800) return `${Math.floor(delta / 86400)}d`;
  return `${Math.floor(delta / 604800)}w`;
}

function upsert(post, fromLive) {
  const existed = posts.has(post.id);
  posts.set(post.id, { ...posts.get(post.id), ...post });
  if (!existed && fromLive && (userPinned || !liveFollow)) {
    waiting += 1;
    newPill.textContent = `${waiting} new posts`;
    newPill.classList.remove("hidden");
    renderChrome();
    return;
  }
  renderAll();
  if (fromLive && !existed && liveFollow && !userPinned) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderAll() {
  feedEl.innerHTML = filtered().map((post) => card(post)).join("");
  renderStories();
  renderGrids();
  const stat = document.getElementById("stat-posts");
  if (stat) stat.textContent = String(posts.size);
  wireCards();
}

function renderChrome() {
  renderStories();
  renderGrids();
}

function media(post) {
  if (post.imageUrl) {
    return `<img src="${post.imageUrl}" alt="" class="ready">`;
  }
  return `<div class="wait">Posting</div>`;
}

function card(post) {
  const s = social(post);
  const long = (post.message || "").length > 140;
  const likedNow = liked.has(post.id);
  const count = s.likes + (likedNow ? 1 : 0);
  const tags = (post.hashtags || []).map((tag) => `#${tag}`).join(" ");
  const heart = `<svg viewBox="0 0 24 24"><path d="M12.1 20.6S4.4 15.7 3.2 11.6C2.2 8.4 4 5.6 7.1 5.6c1.8 0 3.1 1.1 3.9 2.2.8-1.1 2.1-2.2 3.9-2.2 3.1 0 4.9 2.8 3.9 6-1.2 4.1-8.7 9-8.7 9Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
  return `
    <article class="post" data-id="${post.id}">
      <header class="post-head">
        <img class="ava" src="${avatar(s.author.user)}" alt="">
        <div class="who">
          <strong>${escapeHtml(s.author.user)}</strong>
          <small>${escapeHtml(s.author.city)}</small>
        </div>
        <button class="more-btn" type="button" aria-label="More">•••</button>
      </header>
      <div class="media">${media(post)}</div>
      <div class="actions">
        <button class="like${likedNow ? " liked" : ""}" type="button" aria-label="Like">${heart}</button>
        <button type="button" aria-label="Comment"><svg viewBox="0 0 24 24"><path d="M4.4 5.2h15.2v10.4H8.2L4.4 19V5.2Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
        <button type="button" aria-label="Share"><svg viewBox="0 0 24 24"><path d="m4 10.2 16-6.2-6.4 16.2-3.2-7.2L4 10.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
        <button class="push" type="button" aria-label="Save"><svg viewBox="0 0 24 24"><path d="M6.2 4.4h11.6v15.2L12 16.2 6.2 19.6V4.4Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
      </div>
      <p class="likes">Liked by <b>${escapeHtml(s.liker.user)}</b> and <b>others</b> · ${count.toLocaleString()}</p>
      <p class="caption"><b>${escapeHtml(s.author.user)}</b><span class="${long ? "clamp" : ""}">${escapeHtml(post.message)} ${escapeHtml(post.note || "")} <span class="tags">${escapeHtml(tags)}</span></span>${long ? ` <button class="more" type="button">more</button>` : ""}</p>
      <button class="comments" type="button">View all ${s.comments} comments</button>
      ${s.lines.map((line) => `<p class="comment"><b>${escapeHtml(line.user)}</b>${escapeHtml(line.text)}</p>`).join("")}
      <time class="time">${timeAgo(post.created_at)}${post.txid ? ` · <a href="https://mempool.space/tx/${post.txid}" target="_blank" rel="noopener">View transaction</a>` : ""}</time>
    </article>`;
}

function renderStories() {
  const chips = sorted().slice(0, 12).map((post, index) => {
    const who = person(post.id, index);
    return `
      <button class="story-chip" data-story="${index}" type="button">
        <div class="story-ring"><img src="${avatar(who.user)}" alt=""></div>
        <span>${escapeHtml(who.user)}</span>
      </button>`;
  }).join("");
  storiesEl.innerHTML = chips;
}

function renderGrids() {
  const html = filtered().map((post) =>
    `<button type="button" data-id="${post.id}">${
      post.imageUrl ? `<img src="${post.imageUrl}" alt="">` : `<div class="ph"></div>`
    }</button>`
  ).join("");
  searchGrid.innerHTML = html;
  profileGrid.innerHTML = html;
}

function renderSuggested() {
  document.getElementById("suggested").innerHTML = PEOPLE.slice(0, 5).map((p) => `
    <div class="sug">
      <img src="${avatar(p.user)}" alt="">
      <div><strong>${escapeHtml(p.user)}</strong><small>${escapeHtml(p.reason)}</small></div>
      <button class="follow" type="button">Follow</button>
    </div>`).join("");
}

function renderInbox() {
  document.getElementById("inbox").innerHTML = PEOPLE.slice(0, 7).map((p, i) => `
    <button class="thread" type="button">
      <img src="${avatar(p.user)}" alt="">
      <div><strong>${escapeHtml(p.user)}</strong><small>Active ${1 + i}h ago</small></div>
    </button>`).join("");
}

function wireCards() {
  feedEl.querySelectorAll(".more").forEach((btn) => {
    btn.addEventListener("click", () => {
      const span = btn.parentElement.querySelector(".clamp");
      if (span) span.classList.remove("clamp");
      btn.remove();
    });
  });
  feedEl.querySelectorAll(".like").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".post").dataset.id;
      if (liked.has(id)) liked.delete(id);
      else liked.add(id);
      renderAll();
    });
  });
  feedEl.querySelectorAll(".tags").forEach((el) => {
    el.addEventListener("click", (event) => {
      const text = event.target.textContent || "";
      const tag = text.replace(/^#/, "");
      if (tag) openTag(tag);
    });
  });
}

function openTag(tag) {
  filterTag = tag.replace(/^#/, "");
  searchInput.value = `#${filterTag}`;
  setView("search");
  renderAll();
}

function setView(view) {
  searchView.classList.toggle("hidden", view !== "search");
  profileView.classList.toggle("hidden", view !== "profile");
  messagesView.classList.toggle("hidden", view !== "messages");
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === view);
  });
  if (view === "reels") {
    storyIndex = 0;
    showStory();
  }
}

function showStory() {
  const items = sorted();
  if (!items.length) return;
  storyIndex = (storyIndex + items.length) % items.length;
  const post = items[storyIndex];
  const who = person(post.id, storyIndex);
  document.getElementById("story-image").src = post.imageUrl || avatar(who.user);
  document.getElementById("story-user").textContent = who.user;
  document.getElementById("story-caption").textContent = post.message;
  document.getElementById("story-progress").innerHTML = items.slice(0, 12).map((_, i) =>
    `<i class="${i < storyIndex ? "done" : i === storyIndex ? "active" : ""}"><em></em></i>`
  ).join("");
  viewer.classList.remove("hidden");
  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => {
    storyIndex += 1;
    if (storyIndex >= items.length) closeStory();
    else showStory();
  }, 4200);
}

function closeStory() {
  clearTimeout(storyTimer);
  viewer.classList.add("hidden");
}

async function demo() {
  await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
}

async function boot() {
  renderSuggested();
  renderInbox();
  const feed = await fetch("/api/feed").then((r) => r.json());
  feed.posts.forEach((post) => posts.set(post.id, post));
  renderAll();
  const status = await fetch("/api/status").then((r) => r.json());
  liveBadge.classList.toggle("on", status.live);
  const src = new EventSource("/api/stream");
  let opened = false;
  src.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.post) upsert(payload.post, true);
  };
  src.onerror = () => liveBadge.classList.remove("on");
  src.onopen = async () => {
    liveBadge.classList.add("on");
    if (opened) {
      const again = await fetch("/api/feed").then((r) => r.json());
      again.posts.forEach((post) => upsert(post, false));
    }
    opened = true;
  };
}

newPill.addEventListener("click", () => {
  waiting = 0;
  newPill.classList.add("hidden");
  userPinned = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
});

document.getElementById("simulate").addEventListener("click", demo);
document.getElementById("simulate-m").addEventListener("click", demo);
document.getElementById("story-close").addEventListener("click", closeStory);
document.getElementById("story-prev").addEventListener("click", () => { storyIndex -= 1; showStory(); });
document.getElementById("story-next").addEventListener("click", () => { storyIndex += 1; showStory(); });
document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", () => setView(el.dataset.view));
});
storiesEl.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-story]");
  if (!chip) return;
  storyIndex = Number(chip.dataset.story);
  showStory();
});
function openId(id) {
  storyIndex = sorted().findIndex((post) => post.id === id);
  if (storyIndex >= 0) showStory();
}
searchGrid.addEventListener("click", (e) => {
  const cell = e.target.closest("[data-id]");
  if (cell) openId(cell.dataset.id);
});
profileGrid.addEventListener("click", (e) => {
  const cell = e.target.closest("[data-id]");
  if (cell) openId(cell.dataset.id);
});
searchInput.addEventListener("input", () => {
  const value = searchInput.value.trim();
  filterTag = value.startsWith("#") ? value.slice(1) : "";
  filterQuery = filterTag ? "" : value.toLowerCase();
  renderAll();
});
window.addEventListener("scroll", () => {
  userPinned = window.scrollY > 240;
}, { passive: true });

boot().catch(console.error);
