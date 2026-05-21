// Thin wrapper for the `profiles` table. Generates a stable device ID on

// first launch, stores a local cache so the app boots offline, and round-trips

// to Supabase on save.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./supabase";

const DEVICE_ID_KEY = "@saferoute/device_id";

const CACHE_KEY = "@saferoute/profile_cache";

export async function getDeviceId() {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }

  return id;
}

export async function loadProfile() {
  const deviceId = await getDeviceId();

  // Try Supabase first; fall back to local cache if offline.

  try {
    const { data, error } = await supabase

      .from("profiles")

      .select("*")

      .eq("device_id", deviceId)

      .maybeSingle();

    if (!error && data) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));

      return data;
    }
  } catch (_) {
    /* fall through to cache */
  }

  const cached = await AsyncStorage.getItem(CACHE_KEY);

  return cached ? JSON.parse(cached) : null;
}

export async function saveProfile(profile) {
  const deviceId = await getDeviceId();

  const row = {
    ...profile,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase

    .from("profiles")

    .upsert(row, { onConflict: "device_id" })

    .select()

    .single();

  if (error) throw error;

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));

  return data;
}
