# Section 4 — Reflection Questions

## Section 1: Company & Vertical

**Company:** SafeRoute (concept) — modeled on real Indian road-safety/RSA players like **Allianz Partners India**, **Bosch Roadside Assistance**, and **HDFC ERGO Drive Smart**. The voice-AI layer plugs into any of them.

**Vertical:** Insurance / Roadside Assistance / Emergency Response.

**Why voice AI adds real value here:** India sees ~150,000 road deaths a year and many are preventable when help arrives within the "golden hour." Today's RSA flow is: app button → call centre IVR → human agent picks up after 90+ seconds → repeats questions the app already knows the answer to → dispatches. A voice agent collapses that to: button → automated callback in 10 seconds → 60-second assessment with the driver's name, blood group, vehicle, and GPS already loaded → simultaneous dispatch of ambulance + RSA. The agent also handles the case the IVR can't: the driver who is too disoriented to navigate menus but can still answer "are you bleeding?"

---

## Q1. How would you measure if this is working?

Three tiers of metrics, north star → leading → guardrails:

**North star:** Median time from SOS press to ambulance dispatch confirmation. Target: under 75 seconds end-to-end. Today's human-agent benchmark for premium RSA in India is roughly 3–5 minutes.

**Leading indicators (the agent's quality):**

- **Assessment completion rate** — % of calls where the agent successfully extracts all four required variables (`needs_ambulance`, `needs_rsa`, `severity`, `incident_summary`) without escalation. Target: 90%+.

- **False-positive dispatch rate** — % of ambulance dispatches that were not actually needed (driver was fine). Target: under 8%. This is the agent's hardest job — distinguishing "shaken but okay" from "concussed but says I'm fine."

- **Median call duration** — target 45–75 seconds. Under 30s usually means the agent rushed; over 90s means it got stuck.

**Guardrails (what could go wrong):**

- **False-negative rate** — % of calls marked "no ambulance needed" where the driver later self-reports to a hospital. This is the dangerous failure mode and should be near zero, audited weekly against insurance claims.

- **Re-call rate** — % of drivers who press SOS again within 10 minutes of the first call ending. High re-call = agent didn't actually solve the problem.

- **Driver-reported satisfaction** post-incident (single SMS after the case closes, 1–5).

I'd also tag every call by language and check that Tamil/Hindi calls don't degrade on any of the above versus English.

---

## Q2. What would you do next if this were a real pilot?

In rough order of priority:

1. **Wire the dispatch endpoints to real partners.** Right now the backend logs to memory. Step one is integrating with at least one real RSA provider's API (Allianz or Bosch publish dispatch endpoints to their B2B partners) and the Tamil Nadu 108 ambulance dispatch system. Without this it's a demo, not a service.

2. **Add an escalation path to a human dispatcher.** The agent should hand off any call where confidence is low — non-responsive caller, multiple corrections to extracted variables, or severity flagged critical. Bolna supports human handoff; I'd wire it to a small operator team that handles maybe 10% of calls but covers 100% of the edge cases.

3. **Replace hardcoded coords with real GPS + reverse geocoding.** Use the device's last-known location at the moment of SOS press, not at call time (the phone may be damaged or out of battery by then). Cache the last 5 minutes of location server-side.

4. **Pre-call SMS with case ID.** Before the voice agent dials, send the driver a text with the case number and a link to a status page. Helps when calls drop and lets emergency contacts get notified.

5. **A/B test prompt variations** — specifically the opening line and the injury question phrasing. These are the two highest-leverage knobs for call quality.

6. **Compliance + audit log.** Every call recording stored for 90 days, transcripts encrypted, IRDAI-aligned consent capture on first app launch. This is non-negotiable for an insurance product in India.

7. **Tamil-first voice model.** Default to Tamil for Tamil Nadu users (override-able). Bolna supports this via the synthesizer config — picking a native Tamil voice meaningfully changes how drivers respond to a stranger calling them seconds after a crash.

---

## Q3. Sketch a one-paragraph case study from a pilot

> **SafeRoute × Allianz Partners India — 12-week pilot, Chennai, Q2 2026.**

> Allianz integrated SafeRoute's voice-AI responder into their existing RSA app for 8,400 enrolled drivers in the Chennai metro. Over 12 weeks, 312 SOS events were triggered. The Bolna agent reached the driver in a median of 11 seconds and completed assessment in a median of 58 seconds — versus the legacy call-centre benchmark of 4 minutes 20 seconds. Of the 312 calls, 247 were false alarms or minor incidents needing no dispatch (the agent correctly closed them out), 41 triggered RSA dispatch only, 18 triggered both RSA and ambulance, and 6 were escalated to a human dispatcher due to low-confidence assessments (mostly non-responsive callers, which we now route directly to ambulance dispatch). Two incidents involved drivers with serious injuries who could not have navigated the legacy IVR; the agent assessed them via background audio cues and dispatched ambulance to GPS coordinates within 90 seconds of the SOS press. Driver-side NPS for the response experience came in at 71, against 38 for the legacy flow. Allianz is rolling out to Bengaluru and Hyderabad in Q3.
