import React, { useEffect, useState, useCallback } from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";

import { BACKEND_URL } from "../lib/config";

import { colors, radii, space } from "../lib/theme";

export default function DispatchScreen() {
  const [dispatches, setDispatches] = useState([]);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const fetchDispatches = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/dispatches`);

      const data = await res.json();
      console.log('responce data',data)

      setDispatches(data.dispatches || []);

      setError("");
    } catch (e) {
      setError(String(e.message || e));
      console.log('check error for dispatches',e)
    }
  }, []);

  useEffect(() => {
    fetchDispatches();

    const t = setInterval(fetchDispatches, 5000); // poll every 5s

    return () => clearInterval(t);
  }, [fetchDispatches]);

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchDispatches();

    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.hazard}
        />
      }
    >
      <Text style={styles.eyebrow}>STEP 04 / DISPATCH LOG</Text>

      <Text style={styles.title}>Response Center</Text>

      <Text style={styles.sub}>
        After each call, the Bolna agent posts back its decision and this screen
        shows what was dispatched.
      </Text>

      {error ? (
        <View style={[styles.statusBox, { borderColor: colors.emergency }]}>
          <Text style={styles.errorText}>Backend unreachable: {error}</Text>
        </View>
      ) : null}

      {dispatches.length === 0 && !error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>○</Text>

          <Text style={styles.emptyTitle}>No dispatches yet</Text>

          <Text style={styles.emptySub}>
            Trigger an SOS or simulate one from the backend with{"\n"}
            <Text style={styles.mono}>POST /dispatch-test</Text>
          </Text>
        </View>
      ) : null}

      {dispatches.map((d, idx) => (
        <DispatchCard key={d.execution_id + idx} dispatch={d} />
      ))}

      <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
        <Text style={styles.refreshBtnText}>↻ REFRESH</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DispatchCard({ dispatch }) {
  const { decision, dispatched, timestamp } = dispatch;

  const severityColor =
    decision.severity === "critical"
      ? colors.emergency
      : decision.severity === "moderate"
        ? colors.hazard
        : decision.severity === "minor"
          ? colors.info
          : colors.textDim;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.severityBadge, { borderColor: severityColor }]}>
          <View
            style={[styles.severityDot, { backgroundColor: severityColor }]}
          />

          <Text style={[styles.severityText, { color: severityColor }]}>
            {(decision.severity || "unknown").toUpperCase()}
          </Text>
        </View>

        <Text style={styles.timestamp}>
          {new Date(timestamp).toLocaleTimeString()}
        </Text>
      </View>

      <Text style={styles.cardLabel}>INCIDENT SUMMARY</Text>

      <Text style={styles.summary}>{decision.summary}</Text>

      <Text style={[styles.cardLabel, { marginTop: space.md }]}>LOCATION</Text>

      <Text style={styles.location}>{decision.location}</Text>

      <View style={styles.divider} />

      {dispatched.length === 0 ? (
        <Text style={styles.noDispatch}>
          NO SERVICES DISPATCHED — driver declined or false alarm
        </Text>
      ) : (
        dispatched.map((s, i) => (
          <View key={i} style={styles.serviceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>
                {s.service === "AMBULANCE" ? "🚑" : "🛠"} {s.service}
              </Text>

              <Text style={styles.serviceProvider}>{s.provider}</Text>
            </View>

            <View style={styles.etaBadge}>
              <Text style={styles.etaLabel}>ETA</Text>

              <Text style={styles.etaValue}>{s.eta_minutes}min</Text>
            </View>
          </View>
        ))
      )}
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

  empty: { alignItems: "center", paddingVertical: space.xxl * 2 },

  emptyIcon: { color: colors.line, fontSize: 64, marginBottom: space.md },

  emptyTitle: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  mono: { fontFamily: "Courier", color: colors.hazard },

  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,

    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: space.md,
  },

  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,

    paddingHorizontal: space.sm,
    paddingVertical: 4,

    borderWidth: 1,
    borderRadius: radii.pill,
  },

  severityDot: { width: 6, height: 6, borderRadius: 3 },

  severityText: { fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },

  timestamp: { color: colors.textMuted, fontSize: 11, fontFamily: "Courier" },

  cardLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 4,
  },

  summary: { color: colors.text, fontSize: 14, lineHeight: 20 },

  location: { color: colors.text, fontSize: 13 },

  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.md,
  },

  noDispatch: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    textAlign: "center",
  },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: space.sm,

    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  serviceName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },

  serviceProvider: { color: colors.textDim, fontSize: 12 },

  etaBadge: { alignItems: "flex-end" },

  etaLabel: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "700",
  },

  etaValue: { color: colors.hazard, fontSize: 18, fontWeight: "800" },

  statusBox: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,

    borderRadius: radii.sm,
    padding: space.md,
    marginBottom: space.md,
  },

  errorText: { color: colors.emergency, fontSize: 13 },

  refreshBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: space.md,

    borderRadius: radii.sm,
    alignItems: "center",
    marginTop: space.md,
  },

  refreshBtnText: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
  },
});
