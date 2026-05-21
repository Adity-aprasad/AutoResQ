import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native";

import ProfileScreen from "./src/screens/ProfileScreen";

import SOSScreen from "./src/screens/SOSScreen";

import DispatchScreen from "./src/screens/DispatchScreen";

import { loadProfile } from "./src/lib/profile";

import { colors, space } from "./src/lib/theme";

const TABS = [
  { key: "sos", label: "SOS", glyph: "◉" },

  { key: "profile", label: "PROFILE", glyph: "◧" },

  { key: "dispatch", label: "DISPATCH", glyph: "⬢" },
];

export default function App() {
  const [tab, setTab] = useState("profile");

  const [hasProfile, setHasProfile] = useState(false);

  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadProfile();

      const valid = !!(
        p &&
        p.name &&
        p.phone &&
        p.license_base64 &&
        p.aadhaar_base64
      );

      setHasProfile(valid);

      setTab(valid ? "sos" : "profile");

      setChecked(true);
    })();
  }, []);

  if (!checked) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Top brand bar */}

      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>SR</Text>
          </View>

          <View>
            <Text style={styles.brandName}>SAFEROUTE</Text>

            <Text style={styles.brandTag}>
              AI EMERGENCY RESPONSE · POWERED BY BOLNA
            </Text>
          </View>
        </View>

        <View style={styles.statusPill}>
          <View
            style={[
              styles.dot,
              { backgroundColor: hasProfile ? colors.safe : colors.hazard },
            ]}
          />

          <Text style={styles.pillText}>{hasProfile ? "ARMED" : "SETUP"}</Text>
        </View>
      </View>

      {/* Active screen */}

      <View style={{ flex: 1 }}>
        {tab === "profile" && (
          <ProfileScreen
            onSaved={() => {
              setHasProfile(true);

              setTab("sos");
            }}
          />
        )}

        {tab === "sos" && (
          <SOSScreen
            onTriggered={() => setTimeout(() => setTab("dispatch"), 1500)}
          />
        )}

        {tab === "dispatch" && <DispatchScreen />}
      </View>

      {/* Bottom tabs */}

      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = t.key === tab;

          const locked = !hasProfile && t.key !== "profile";

          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tab}
              onPress={() => !locked && setTab(t.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabGlyph,

                  active && styles.tabGlyphActive,

                  locked && styles.tabLocked,
                ]}
              >
                {t.glyph}
              </Text>

              <Text
                style={[
                  styles.tabLabel,

                  active && styles.tabLabelActive,

                  locked && styles.tabLocked,
                ]}
              >
                {t.label}
              </Text>

              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? 24 : 0,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: space.lg,
    paddingVertical: space.md,

    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },

  brandMark: {
    width: 36,
    height: 36,
    backgroundColor: colors.hazard,

    alignItems: "center",
    justifyContent: "center",

    transform: [{ rotate: "45deg" }],
  },

  brandMarkText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,

    transform: [{ rotate: "-45deg" }],
  },

  brandName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },

  brandTag: {
    color: colors.textDim,
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginTop: 2,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,

    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,

    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },

  dot: { width: 6, height: 6, borderRadius: 3 },

  pillText: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "800",
  },

  tabBar: {
    flexDirection: "row",

    borderTopWidth: 1,
    borderTopColor: colors.line,

    backgroundColor: colors.bgElev,

    paddingVertical: space.sm,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.xs,
    position: "relative",
  },

  tabGlyph: { color: colors.textMuted, fontSize: 18, marginBottom: 2 },

  tabGlyphActive: { color: colors.hazard },

  tabLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },

  tabLabelActive: { color: colors.hazard },

  tabLocked: { opacity: 0.3 },

  tabIndicator: {
    position: "absolute",
    top: 0,
    height: 2,
    width: 32,

    backgroundColor: colors.hazard,
  },
});
