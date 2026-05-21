// Supabase client for React Native. The url-polyfill import is required

// because supabase-js uses URL() internally and RN's polyfill isn't loaded

// by default.

import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,

    autoRefreshToken: true,

    persistSession: true,

    detectSessionInUrl: false,
  },
});
