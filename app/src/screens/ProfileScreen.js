import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { loadProfile, saveProfile } from "../lib/profile";

import { colors, radii, space } from "../lib/theme";

export default function ProfileScreen({ onSaved }) {
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",

    phone: "",

    blood_group: "",

    vehicle_reg: "",

    emergency_contact: "",

    license_base64: "",

    license_filename: "",

    aadhaar_base64: "",

    aadhaar_filename: "",
  });

  useEffect(() => {
    (async () => {
      const existing = await loadProfile();

      if (existing) setForm((f) => ({ ...f, ...existing }));

      setLoading(false);
    })();
  }, []);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickDoc = async (which) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to upload documents.",
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,

      base64: true,

      quality: 0.6, // keep base64 payload small
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    const dataUri = `data:image/jpeg;base64,${asset.base64}`;

    if (which === "license") {
      update("license_base64", dataUri);

      update("license_filename", asset.fileName || "licence.jpg");
    } else {
      update("aadhaar_base64", dataUri);

      update("aadhaar_filename", asset.fileName || "aadhaar.jpg");
    }
  };

  const clearDoc = (which) => {
    if (which === "license") {
      update("license_base64", "");

      update("license_filename", "");
    } else {
      update("aadhaar_base64", "");

      update("aadhaar_filename", "");
    }
  };

  const onSave = async () => {
    if (!form.name?.trim() || !form.phone?.trim()) {
      Alert.alert("Missing details", "Name and phone number are required.");

      return;
    }

    if (!/^\+\d{10,15}$/.test(form.phone.trim())) {
      Alert.alert("Phone format", "Use E.164 format, e.g. +919876543210");

      return;
    }

    if (!form.license_base64 || !form.aadhaar_base64) {
      Alert.alert(
        "Documents required",
        "Please upload both your driving licence and Aadhaar card.",
      );

      return;
    }

    try {
      setSaving(true);

      await saveProfile(form);

      Alert.alert("Saved", "Profile saved. You can now use SOS.");

      onSaved?.();
    } catch (e) {
      Alert.alert("Save failed", String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.hazard} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>STEP 01 / DRIVER PROFILE</Text>

        <Text style={styles.title}>Set up your safety profile</Text>

        <Text style={styles.sub}>
          We send these details to the AI responder so it can identify you, know
          your blood group, and dispatch the right service.
        </Text>

        <Field
          label="Full name"
          value={form.name}
          onChange={(v) => update("name", v)}
          placeholder="Arjun Subramaniam"
        />

        <Field
          label="Phone (E.164)"
          value={form.phone}
          onChange={(v) => update("phone", v)}
          placeholder="+919876543210"
          keyboardType="phone-pad"
        />

        <Row>
          <Field
            label="Blood group"
            value={form.blood_group}
            onChange={(v) => update("blood_group", v)}
            placeholder="O+"
            half
          />

          <Field
            label="Vehicle reg."
            value={form.vehicle_reg}
            onChange={(v) => update("vehicle_reg", v)}
            placeholder="TN 09 AB 1234"
            half
          />
        </Row>

        <Field
          label="Emergency contact (optional)"
          value={form.emergency_contact}
          onChange={(v) => update("emergency_contact", v)}
          placeholder="+919812345678"
          keyboardType="phone-pad"
        />

        <View style={{ height: space.xl }} />

        <Text style={styles.eyebrow}>STEP 02 / IDENTITY DOCUMENTS</Text>

        <DocUpload
          label="Driving Licence"
          file={form.license_base64}
          filename={form.license_filename}
          onPick={() => pickDoc("license")}
          onClear={() => clearDoc("license")}
        />

        <DocUpload
          label="Aadhaar Card"
          file={form.aadhaar_base64}
          filename={form.aadhaar_filename}
          onPick={() => pickDoc("aadhaar")}
          onClear={() => clearDoc("aadhaar")}
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveBtnText}>SAVE PROFILE</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, half }) {
  return (
    <View style={[styles.field, half && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function Row({ children }) {
  return (
    <View style={{ flexDirection: "row", gap: space.md }}>{children}</View>
  );
}

function DocUpload({ label, file, filename, onPick, onClear }) {
  return (
    <View style={styles.docCard}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>

      {file ? (
        <View style={styles.docPreview}>
          <Image source={{ uri: file }} style={styles.docThumb} />

          <View style={{ flex: 1 }}>
            <Text style={styles.docFilename} numberOfLines={1}>
              {filename}
            </Text>

            <Text style={styles.docMeta}>UPLOADED · STORED AS BASE64</Text>
          </View>

          <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>REMOVE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={onPick}
          activeOpacity={0.7}
        >
          <Text style={styles.uploadIcon}>＋</Text>

          <Text style={styles.uploadText}>
            TAP TO UPLOAD{" "}
            <Text style={{ color: colors.hazard }}>{label.toUpperCase()}</Text>
          </Text>
        </TouchableOpacity>
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

  field: { marginBottom: space.md },

  fieldLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",

    marginBottom: space.xs,
  },

  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,

    borderRadius: radii.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,

    color: colors.text,
    fontSize: 15,
  },

  docCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,

    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },

  uploadBtn: {
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderStyle: "dashed",

    borderRadius: radii.sm,
    paddingVertical: space.xl,
    alignItems: "center",

    marginTop: space.sm,
  },

  uploadIcon: {
    color: colors.hazard,
    fontSize: 28,
    marginBottom: 4,
    fontWeight: "300",
  },

  uploadText: {
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
  },

  docPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.sm,
  },

  docThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },

  docFilename: { color: colors.text, fontSize: 14, fontWeight: "600" },

  docMeta: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
    fontWeight: "600",
  },

  clearBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },

  clearBtnText: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
  },

  saveBtn: {
    backgroundColor: colors.hazard,
    paddingVertical: space.lg,
    borderRadius: radii.sm,

    alignItems: "center",
    marginTop: space.xl,
  },

  saveBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
