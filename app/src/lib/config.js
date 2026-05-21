// app/src/lib/config.js


export const BACKEND_URL = "http://localhost:4000";  // ← CHANGE THIS

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const FIXED_LOCATION = {
  lat: 13.0604,
  lng: 80.2496,
  address: "Anna Salai, near LIC Building, Chennai, Tamil Nadu",
};