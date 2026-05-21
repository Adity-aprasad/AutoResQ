-- Run this in Supabase → SQL Editor. 

-- Schema for SafeRoute SOS: one row per user, holds the profile and the two 

-- ID documents as base64. Keep it dead simple — no auth yet, anon access OK 

-- for a demo. Tighten with RLS + auth before going to production. 

 

create table if not exists profiles ( 

  id uuid primary key default gen_random_uuid(), 

  device_id text unique not null,        -- random ID generated on first launch 

  name text, 

  phone text,                            -- E.164, e.g. +919876543210 

  blood_group text, 

  vehicle_reg text, 

  emergency_contact text, 

  license_base64 text,                   -- driving licence image, base64 

  license_filename text, 

  aadhaar_base64 text,                   -- aadhaar card image, base64 

  aadhaar_filename text, 

  created_at timestamptz default now(), 

  updated_at timestamptz default now() 

); 

 

-- Demo-grade permissions: let the anon key read/write. In production: 

-- tie to auth.uid() and write proper RLS policies. 

alter table profiles enable row level security; 

 

create policy "anon read"  on profiles for select using (true); 

create policy "anon insert" on profiles for insert with check (true); 

create policy "anon update" on profiles for update using (true) with check (true); 

 

 