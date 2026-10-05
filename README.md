# WOL Voice Reader

A personal listening tool for [Watchtower ONLINE LIBRARY](https://wol.jw.org) resources, powered by the local [Voicebox](https://voicebox.sh) text-to-speech application.

> **Not affiliated with, sponsored by, or endorsed by JW.ORG, WOL, or Watch Tower Bible and Tract Society.**

---

## How it works

```
WOL article URL (user-supplied)
  → Next.js server (fetches one page, extracts text, discards HTML)
  → local Voicebox (http://127.0.0.1:17493)
  → generated audio
  → browser audio player
```

No WOL text or generated audio is stored on the server.  
No cloud TTS service is used. Everything runs on your own computer.

---

## Prerequisites

- **Node.js 18+** (or Bun)
- **Voicebox desktop app** — [voicebox.sh](https://voicebox.sh)

---

## 1. Install Voicebox

1. Go to [voicebox.sh](https://voicebox.sh) and download the desktop application for your platform (macOS / Windows / Linux).
2. Install and launch Voicebox.
3. Create at least one **voice profile** inside the Voicebox UI (Profiles → New Profile).
4. Voicebox automatically starts its local REST API on `http://127.0.0.1:17493`.  
   Verify this by opening [http://127.0.0.1:17493/docs](http://127.0.0.1:17493/docs) in your browser — you should see the interactive API documentation.

---

## 2. Install WOL Voice Reader

```bash
# Clone or download the project
cd wol-voice-reader

# Install dependencies
npm install          # or: bun install

# Copy the environment template
cp .env.local.example .env.local
```

Edit `.env.local` only if Voicebox is running on a non-default port:

```
VOICEBOX_HOST=http://127.0.0.1:17493
```

---

## 3. Start WOL Voice Reader

```bash
npm run dev          # starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Configure the Voicebox connection

1. On the main screen, click **Settings — Voicebox Connection** to expand it.
2. The default host `http://127.0.0.1:17493` is pre-filled.
3. Click **Test Voicebox Connection**.
   - **Green ✓**: Voicebox is running and reachable. Voice profiles will load automatically.
   - **Red ✗**: Voicebox is not running. Launch the Voicebox application and try again.
4. Select a **voice profile** from the dropdown.

---

## 5. Load a WOL article

**Option A — URL:**
1. Paste a `https://wol.jw.org/…` URL into the WOL URL field.
2. Click **Load**.

**Option B — Paste text:**
1. Switch to the **Paste Text** tab.
2. Paste article text you are authorised to use.
3. Click **Read Aloud**.

---

## 6. Playback controls

| Control | Action |
|---|---|
| Play | Generate speech for current paragraph and start playback |
| Pause | Pause at current position |
| Resume | Continue from paused position |
| Stop | Stop and discard current audio |
| Restart | Re-generate and replay current paragraph |
| Previous / Next | Move to adjacent paragraph |
| Speed | 0.75× · 1.0× · 1.25× · 1.5× · 2.0× |
| Volume | Drag slider |

Playback position and speed are remembered in your browser (localStorage only).

---

## Security notes

- URL validation ensures only `https://wol.jw.org` URLs are fetched.
- Voicebox host is restricted to `localhost` / `127.0.0.1` — no arbitrary external URLs.
- No API keys are stored. No cloud TTS service is contacted.
- WOL article text is processed in memory and never written to disk or logged.
- Generated audio is streamed directly to the browser as a transient blob URL and is never saved server-side.

---

## Production build

```bash
npm run build
npm start
```

---

## Copyright reminder

> **Before distributing this application publicly**, review the current  
> [JW.ORG / WOL Terms of Use](https://www.jw.org/en/terms-of-use/)  
> and confirm that your use case is permitted.

This application is intended for personal use only.

---

## Verification checklist

- [ ] Voicebox is running (`http://127.0.0.1:17493/docs` opens)
- [ ] At least one voice profile exists in Voicebox
- [ ] "Test Voicebox Connection" shows green ✓
- [ ] A voice profile appears in the dropdown
- [ ] A `https://wol.jw.org` URL loads successfully
- [ ] A non-WOL URL is rejected with an error message
- [ ] Paste-text mode works independently of WOL URL fetching
- [ ] Play / Pause / Resume / Stop / Restart all function correctly
- [ ] Next / Previous paragraph navigation works
- [ ] Speed buttons change playback rate
- [ ] Volume slider changes output level
- [ ] Current paragraph is highlighted in the text display
- [ ] Playback position is remembered after page reload
- [ ] No API keys appear in browser DevTools network requests
- [ ] No WOL content is written to disk or appears in server logs
