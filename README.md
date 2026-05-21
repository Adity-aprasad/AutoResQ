# SafeRoute SOS — AI Emergency Responder

A real, runnable SOS app for drivers in India. Press the button after an

accident → Bolna's voice agent calls you back → assesses injuries and vehicle

damage → dispatches RSA + ambulance based on what you say.

**Stack:**

- **Expo (React Native)** — the driver-facing mobile app

- **Express** — backend that calls the Bolna `/call` API and receives the post-call webhook

- **Supabase** — stores user profile + driving licence + Aadhaar (base64)

- **Bolna** — outbound voice agent ($5 free credits cover ~50–80 demo minutes)

```

┌─────────────────┐   POST /sos    ┌─────────────────┐   POST /call    ┌──────────┐

│  Expo app       │ ─────────────▶ │  Express        │ ──────────────▶ │  Bolna   │

│  (driver press) │                │  backend        │                 │  agent   │

└─────────────────┘                └─────────────────┘                 └─────┬────┘

        ▲                                  ▲                                 │

        │ GET /dispatches                  │ POST /bolna-webhook             │ phone call

        │                                  │   (extracted vars)              │ to driver

        │                                  └─────────────────────────────────┘

        │

        └── shows what was dispatched

```

---

## Setup (one-time, ~15 min)

### 1. Bolna agent

1. Sign up at **https://platform.bolna.ai** — you get $5 free credits.

2. Create a new agent. For each field:
   - **System Prompt:** paste the contents of [`BOLNA_PROMPT.md`](./BOLNA_PROMPT.md).

   - **LLM:** `gpt-4o-mini` (cheap and fast; quality is fine for this).

   - **Synthesizer:** any natural Indian-English voice (ElevenLabs "Aria" or Azure "en-IN-NeerjaNeural" both work well).

   - **Transcriber:** Deepgram Nova-2.

   - **Extracted variables:** add four — `needs_ambulance`, `needs_rsa`, `severity`, `incident_summary`. Set the format/description per the prompt.

   - **Webhook URL:** the public URL of your Express backend's `/bolna-webhook` endpoint (use `ngrok http 4000` and paste the ngrok URL).

3. Save and copy the **Agent ID** (UUID at the top of the agent page).

4. Go to **Settings → Developers** and copy your **API key**.

### 2. Supabase

1. Create a project at **https://supabase.com**.

2. **SQL Editor** → paste [`supabase/schema.sql`](./supabase/schema.sql) → Run.

3. **Project Settings → API** → copy the **Project URL** and the **anon public** key.

### 3. Backend

```bash

cd backend

cp .env.example .env

# Fill in BOLNA_API_KEY and BOLNA_AGENT_ID

npm install

npm run dev

```

Backend listens on `http://localhost:4000`.

In a second terminal, expose it so Bolna's webhook can reach you:

```bash

ngrok http 4000

# Copy the https URL, e.g. https://abc123.ngrok-free.app

# Paste https://abc123.ngrok-free.app/bolna-webhook into your Bolna agent's Webhook URL field

```

### 4. Expo app

```bash

cd app

npm install

```

Edit `app/src/lib/config.js`:

- `BACKEND_URL` — your computer's LAN IP, e.g. `http://192.168.1.5:4000`. Run `ipconfig` (Windows) or `ifconfig` (macOS/Linux) to find it. (On the iOS simulator `localhost` works; on Android emulator use `10.0.2.2`; on a real device, you need the LAN IP.)

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` from step 2.

Then run:

```bash

npx expo start

```

Scan the QR code in the **Expo Go** app on your phone (App Store / Play Store).

---

## How to demo it

1. Open the app → Profile screen.

2. Fill in your name and **your real phone number in E.164 format** (e.g. `+919876543210`) — this is the number Bolna will dial.

3. Upload any two images for licence and Aadhaar (demo only).

4. Save → app switches to the SOS tab.

5. Hold the red button for 1.5 seconds.

6. Your phone rings within 5–10 seconds. Maya (the agent) picks up and runs the assessment.

7. After the call ends, switch to the Dispatch tab → you'll see the dispatch decision and ETAs.

### Demo without burning Bolna credits

To test the dispatch UI without making real calls:

```bash

curl -X POST http://localhost:4000/dispatch-test \

  -H "Content-Type: application/json" \

  -d '{

    "needs_ambulance": true,

    "needs_rsa": true,

    "severity": "moderate",

    "summary": "Driver hit divider on Anna Salai, cut on forehead, car not drivable.",

    "location": "Anna Salai, Chennai"

  }'

```

Then check the Dispatch tab in the app — the card will appear within 5 seconds.

---

## Files at a glance

```

sos-app/

├── BOLNA_PROMPT.md            ← Paste into Bolna's system prompt field (Section 2)

├── SECTION_4_ANSWERS.md       ← Metrics, next steps, case study (Section 4)

├── README.md                  ← You are here

├── backend/

│   ├── server.js              ← Express server, /sos + /bolna-webhook

│   ├── .env.example

│   └── package.json

├── supabase/

│   └── schema.sql             ← Run once in Supabase SQL editor

└── app/

    ├── App.js                 ← Tab navigation + brand bar

    ├── app.json

    ├── package.json

    └── src/

        ├── lib/

        │   ├── config.js      ← EDIT THIS: backend URL + Supabase keys

        │   ├── supabase.js

        │   ├── profile.js

        │   └── theme.js

        └── screens/

            ├── ProfileScreen.js   ← Onboarding + doc upload

            ├── SOSScreen.js       ← The big red button

            └── DispatchScreen.js  ← Post-call response log

```

---

## What to put in the assignment form

- **Section 1 — Company & vertical:** see [`SECTION_4_ANSWERS.md`](./SECTION_4_ANSWERS.md) (top section).

- **Section 2 — Prompt:** paste [`BOLNA_PROMPT.md`](./BOLNA_PROMPT.md).

- **Section 3 — Demo:** record a screen capture of the app + a recording of the actual phone call (Bolna stores call recordings in the dashboard → Agent Executions → Recording). Your Agent ID is the UUID from your Bolna dashboard.

- **Section 4 — Three questions:** see [`SECTION_4_ANSWERS.md`](./SECTION_4_ANSWERS.md).

---

## Free-tier notes

- Bolna gives **$5 in free credits on signup.** At ~$0.06–0.10 per minute (LLM + TTS + STT + platform fee, telephony separate) you get roughly **50–80 minutes of calls** — plenty for iteration and a demo recording.

- Supabase free tier covers this app comfortably (500MB DB, 50K monthly active users).

- ngrok free tier works for local webhook testing but the URL changes every restart — paste a fresh URL into Bolna's webhook field each session, or upgrade to a static domain.
