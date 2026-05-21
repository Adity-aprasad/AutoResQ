// server.js — SOS Emergency backend

// ----------------------------------

// Flow:

//   1) Expo app hits POST /sos with { phone, location, user } when the user

//      presses the SOS button.

//   2) We call Bolna's /call API to trigger an outbound call to the driver.

//   3) Bolna agent talks to the driver, fills extracted variables

//      (needs_ambulance, needs_rsa, severity, incident_summary).

//   4) When the call ends Bolna POSTs to /bolna-webhook. We read the extracted

//      data and "dispatch" RSA + ambulance (logged + stored in memory).

//   5) Expo app polls /dispatches to show what was dispatched.

require("dotenv").config();

const express = require("express");

const cors = require("cors");

const fetch = require("node-fetch");

const app = express();

app.use(cors());

app.use(express.json({ limit: "20mb" }));

const { BOLNA_API_KEY, BOLNA_AGENT_ID, PORT = 4000 } = process.env;

if (!BOLNA_API_KEY || !BOLNA_AGENT_ID) {
  console.warn(
    "\n⚠️  BOLNA_API_KEY or BOLNA_AGENT_ID missing. Copy .env.example to .env and fill them in.\n",
  );
}

// In-memory dispatch log. Resets on server restart — fine for a demo.

const dispatches = [];

// ---------------------------------------------------------------------------

// POST /sos — Expo app triggers this when the SOS button is held.

// Body: { phone, location:{lat,lng,address}, user:{name,bloodGroup,vehicle} }

// ---------------------------------------------------------------------------

app.post("/sos", async (req, res) => {
  const { phone, location = {}, user = {} } = req.body || {};

  if (!phone) {
    return res

      .status(400)

      .json({ error: "phone is required in E.164 format, e.g. +919876543210" });
  }

  // user_data is passed to the Bolna agent and can be referenced in the prompt

  // via {caller_name}, {location_address}, etc.

  const userData = {
    caller_name: user.name || "the driver",

    blood_group: user.bloodGroup || "unknown",

    vehicle_reg: user.vehicle || "unknown",

    location_lat: String(location.lat ?? ""),

    location_lng: String(location.lng ?? ""),

    location_address: location.address || "GPS coordinates only",
  };

  console.log("\n🚨 SOS triggered →");

  console.log("   phone:", phone);

  console.log("   user_data:", userData);

  try {
    const bolnaRes = await fetch("https://api.bolna.ai/call", {
      method: "POST",

      headers: {
        Authorization: `Bearer ${BOLNA_API_KEY}`,

        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        agent_id: BOLNA_AGENT_ID,

        recipient_phone_number: phone,

        user_data: userData,
      }),
    });

    const data = await bolnaRes.json();

    if (!bolnaRes.ok) {
      console.error("❌ Bolna /call failed:", bolnaRes.status, data);

      return res
        .status(bolnaRes.status)
        .json({ error: "bolna_failed", detail: data });
    }

    console.log("✅ Bolna queued call:", data);

    return res.json({
      ok: true,

      execution_id: data.execution_id,

      status: data.status,

      message: "Call queued. The Bolna agent will dial you shortly.",
    });
  } catch (err) {
    console.error("❌ Bolna network error:", err);

    return res
      .status(500)
      .json({ error: "network_error", detail: String(err) });
  }
});

// ---------------------------------------------------------------------------

// POST /bolna-webhook — Bolna posts here when a call ends. Set this URL in the

// agent's "Webhook URL" field on the Bolna dashboard (use ngrok for local dev).

// ---------------------------------------------------------------------------

app.post("/bolna-webhook", (req, res) => {
  const payload = req.body || {};

  console.log("\n📞 Bolna webhook received:");

  console.log(JSON.stringify(payload, null, 2));

  // Bolna's payload shape varies — pull from the common locations.

  const extracted =
    payload.extracted_data ||
    payload.context_details?.recipient_data ||
    payload.variables ||
    {};

  const decision = {
    needs_ambulance: parseBool(extracted.needs_ambulance),

    needs_rsa: parseBool(extracted.needs_rsa),

    severity: extracted.severity || "unknown", // minor | moderate | critical

    summary: extracted.incident_summary || payload.summary || "(no summary)",

    location: extracted.location_address || "GPS from app",

    caller: extracted.caller_name || "driver",
  };

  const dispatch = dispatchServices(
    decision,
    payload.execution_id || "unknown",
  );

  dispatches.unshift(dispatch);

  res.json({ ok: true, dispatched: dispatch });
});

// ---------------------------------------------------------------------------

// GET /dispatches — Expo app polls this after a call to render the result.

// ---------------------------------------------------------------------------

app.get("/dispatches", (_req, res) => {
  res.json({ dispatches: dispatches.slice(0, 20) });
});

// ---------------------------------------------------------------------------

// POST /dispatch-test — simulate a webhook for iterating without a real call.

// ---------------------------------------------------------------------------

app.post("/dispatch-test", (req, res) => {
  const decision = {
    needs_ambulance: !!req.body.needs_ambulance,

    needs_rsa: !!req.body.needs_rsa,

    severity: req.body.severity || "moderate",

    summary: req.body.summary || "Manual test dispatch",

    location: req.body.location || "Test location",

    caller: "test-user",
  };

  const dispatch = dispatchServices(decision, "manual-test-" + Date.now());

  dispatches.unshift(dispatch);

  res.json({ ok: true, dispatched: dispatch });
});

// ---------------------------------------------------------------------------

// In a real system this would hit Allianz / Bosch RSA APIs and the state's

// 108 dispatch endpoint. Here we log + store in memory so the app can render.

// ---------------------------------------------------------------------------

function dispatchServices(decision, executionId) {
  const dispatched = [];

  if (decision.needs_ambulance) {
    console.log(
      `🚑 [DISPATCH] Ambulance → ${decision.location} (severity: ${decision.severity})`,
    );

    dispatched.push({
      service: "AMBULANCE",

      provider: "108 Emergency Response (Tamil Nadu)",

      eta_minutes: decision.severity === "critical" ? 8 : 14,
    });
  }

  if (decision.needs_rsa) {
    console.log(`🛠  [DISPATCH] RSA → ${decision.location}`);

    dispatched.push({
      service: "RSA",

      provider: "Allianz Roadside Assist",

      eta_minutes: 22,
    });
  }

  if (dispatched.length === 0) {
    console.log("ℹ️  No services dispatched (false alarm or driver declined).");
  }

  return {
    execution_id: executionId,

    timestamp: new Date().toISOString(),

    decision,

    dispatched,
  };
}

function parseBool(v) {
  if (typeof v === "boolean") return v;

  if (typeof v === "string") return /^(yes|true|1|y)$/i.test(v.trim());

  return false;
}

app.get("/", (_req, res) =>
  res.json({
    name: "SOS Emergency backend",

    endpoints: [
      "POST /sos",
      "POST /bolna-webhook",
      "GET /dispatches",
      "POST /dispatch-test",
    ],
  }),
);

app.listen(PORT, () => {
  console.log(`\n🟢 SOS backend on http://localhost:${PORT}`);

  console.log(
    `   Webhook URL for Bolna agent: http://<your-ngrok-domain>/bolna-webhook\n`,
  );
});
