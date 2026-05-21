import React, { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from "react-native";

import { loadProfile } from "../lib/profile";

import { BACKEND_URL, FIXED_LOCATION } from "../lib/config";

import { colors, radii, space } from "../lib/theme";

// Hold-to-trigger duration: prevents accidental SOS.

const HOLD_MS = 1500;

export default function SOSScreen({ onTriggered }) {
  const [profile, setProfile] = useState(null);

  const [phase, setPhase] = useState("armed"); // armed | holding | calling | error

  const [errorMsg, setErrorMsg] = useState("");

  const [executionId, setExecutionId] = useState(null);

  const holdAnim = useRef(new Animated.Value(0)).current;

  const pulseAnim = useRef(new Animated.Value(0)).current;

  const holdTimer = useRef(null);

  useEffect(() => {
    (async () => setProfile(await loadProfile()))();
  }, []);

  // Idle pulsing on the SOS ring

  useEffect(() => {
    if (phase === "armed") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),

          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1100,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [phase, pulseAnim]);

  const startHold = () => {
    if (!profile?.phone) {
      Alert.alert("Profile required", "Set up your profile first.");

      return;
    }

    setPhase("holding");

    Animated.timing(holdAnim, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    holdTimer.current = setTimeout(() => triggerSOS(), HOLD_MS);
  };

  const cancelHold = () => {
    if (phase !== "holding") return;

    clearTimeout(holdTimer.current);

    Animated.timing(holdAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    setPhase("armed");
  };

const triggerSOS = async () => {
  setPhase("calling");

  try {
    console.log('🚨 SOS Trigger:', {
      backendUrl: BACKEND_URL,
      phone: profile.phone,
      location: FIXED_LOCATION,
    });

    // Create abort controller with 20s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${BACKEND_URL}/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: profile.phone,
        location: FIXED_LOCATION,
        user: {
          name: profile.name,
          bloodGroup: profile.blood_group,
          vehicle: profile.vehicle_reg,
        },
      }),
      signal: controller.signal, // ← enables timeout abort
    });

    clearTimeout(timeoutId);

    console.log('📡 Response received:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    });

    const data = await res.json();
    console.log('✅ Response data:', data);

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    setExecutionId(data.execution_id);
    onTriggered?.(data.execution_id);
    
  } catch (e) {
    console.error('❌ SOS Error:', {
      name: e.name,
      message: e.message,
      code: e.code,
      stack: e.stack,
    });

    // Distinguish between different error types
    let errorMsg = String(e.message || e);
    
    if (e.name === 'AbortError') {
      errorMsg = 'Request timeout (20s) — backend unreachable or very slow';
    } else if (e.message.includes('Network request failed')) {
      errorMsg = 'Network error — check WiFi and LAN IP in config.js';
    }

    setErrorMsg(errorMsg);
    setPhase("error");
  }
};

  const reset = () => {
    holdAnim.setValue(0);

    setExecutionId(null);

    setErrorMsg("");

    setPhase("armed");
  };

  // Visual states

  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  const buttonBg =
    phase === "calling"
      ? colors.safe
      : phase === "holding"
        ? colors.hazard
        : colors.emergency;

  const buttonLabel =
    phase === "calling"
      ? "CALLING"
      : phase === "holding"
        ? "HOLD…"
        : phase === "error"
          ? "RETRY"
          : "SOS";

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>EMERGENCY RESPONDER</Text>

      <Text style={styles.title}>Held an accident?</Text>

      <Text style={styles.sub}>
        Hold the button for 1.5s. Bolna's AI responder will call you back in
        seconds to assess injuries and dispatch help.
      </Text>

      <View style={styles.buttonWrap}>
        {phase === "armed" && (
          <Animated.View
            style={[
              styles.pulseRing,

              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={startHold}
          onPressOut={cancelHold}
          onPress={phase === "error" ? reset : undefined}
          disabled={phase === "calling"}
          style={[styles.sosButton, { backgroundColor: buttonBg }]}
        >
          {/* Hold progress arc */}

          {phase === "holding" && (
            <Animated.View
              style={[
                styles.holdFill,

                {
                  height: holdAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          )}

          <Text style={styles.sosLabel}>{buttonLabel}</Text>

          {phase === "armed" && (
            <Text style={styles.sosHint}>HOLD TO TRIGGER</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <InfoRow label="DRIVER" value={profile?.name || "—"} />

        <InfoRow label="PHONE" value={profile?.phone || "—"} />

        <InfoRow label="VEHICLE" value={profile?.vehicle_reg || "—"} />

        <InfoRow label="LOCATION (FIXED)" value={FIXED_LOCATION.address} />

        <InfoRow
          label="COORDS"
          value={`${FIXED_LOCATION.lat}, ${FIXED_LOCATION.lng}`}
          mono
        />
      </View>

      {phase === "calling" && executionId && (
        <View style={styles.statusBox}>
          <View style={[styles.statusDot, { backgroundColor: colors.safe }]} />

          <Text style={styles.statusText}>
            Call queued. Execution ID:{" "}
            <Text style={styles.mono}>{executionId.slice(0, 8)}…</Text>
          </Text>
        </View>
      )}

      {phase === "error" && (
        <View style={[styles.statusBox, { borderColor: colors.emergency }]}>
          <View
            style={[styles.statusDot, { backgroundColor: colors.emergency }]}
          />

          <Text style={styles.statusText}>Error: {errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    paddingTop: space.xxl,
  },

  eyebrow: {
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: space.sm,
  },

  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: space.sm,
  },

  sub: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: space.xl,
  },

  buttonWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: space.xl,
  },

  pulseRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,

    borderWidth: 3,
    borderColor: colors.emergency,
  },

  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",

    shadowColor: "#ff2d2d",
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },

  holdFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,

    backgroundColor: "rgba(255,255,255,0.18)",
  },

  sosLabel: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 4,
  },

  sosHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,

    borderRadius: radii.md,
    padding: space.md,
    marginTop: space.lg,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  infoLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
  },

  infoValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: space.md,
  },

  mono: { fontFamily: "Courier" },

  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,

    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,

    borderRadius: radii.sm,
    padding: space.md,
    marginTop: space.md,
  },

  statusDot: { width: 8, height: 8, borderRadius: 4 },

  statusText: { color: colors.text, fontSize: 13, flex: 1 },
});
