-- ========================================================
-- Supabase Schema for Layer 2: CareRoute AI Hospitals
-- Table Name: hospitals
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Reset Hospitals Table Structure
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    icu_beds INT NOT NULL,
    blood_stock JSONB NOT NULL,
    equipment TEXT[] NOT NULL,
    specialists TEXT[] NOT NULL
);

-- 2. Clear old test data
TRUNCATE TABLE hospitals RESTART IDENTITY CASCADE;

-- 3. Insert Real World Hospitals Data
INSERT INTO hospitals (name, latitude, longitude, icu_beds, blood_stock, equipment, specialists)
VALUES 
(
  'Apollo Health City (Jubilee Hills)', 
  17.4258, 78.4116, 
  5, 
  '{"O_NEG": 4, "A_POS": 12, "B_POS": 8, "AB_NEG": 2}', 
  ARRAY['VENTILATOR', 'ECMO', 'CT_SCANNER', 'CATH_LAB', 'DIALYSIS'], 
  ARRAY['TRAUMA_SURGEON', 'NEUROSURGEON', 'CARDIOLOGIST']
),
(
  'Care Hospitals (Hitec City)', 
  17.4401, 78.3789, 
  2, 
  '{"O_NEG": 1, "A_POS": 4, "B_POS": 6, "AB_NEG": 0}', 
  ARRAY['VENTILATOR', 'ECMO', 'DEFIBRILLATOR'], 
  ARRAY['NEUROSURGEON', 'PULMONOLOGIST']
),
(
  'Yashoda Hospitals (Hitec City)', 
  17.4512, 78.3810, 
  6, 
  '{"O_NEG": 2, "A_POS": 15, "B_POS": 10, "AB_NEG": 1}', 
  ARRAY['VENTILATOR', 'CT_SCANNER', 'DIALYSIS', 'CATH_LAB'], 
  ARRAY['CARDIOLOGIST', 'TRAUMA_SURGEON']
),
(
  'Medicover Hospitals (Madhapur)', 
  17.4475, 78.3762, 
  1, 
  '{"O_NEG": 0, "A_POS": 8, "B_POS": 5, "AB_NEG": 0}', -- No O_NEG Blood (Tests Blood Filter)
  ARRAY['VENTILATOR', 'CT_SCANNER', 'DEFIBRILLATOR'], 
  ARRAY['GENERAL_SURGEON', 'PULMONOLOGIST']
),
(
  'KIMS Hospital (Gachibowli)', 
  17.4436, 78.3614, 
  0, -- 0 ICU Beds (Tests Hard Constraint Bed Exclusion Filter)
  '{"O_NEG": 3, "A_POS": 5, "B_POS": 2, "AB_NEG": 0}', 
  ARRAY['VENTILATOR', 'DIALYSIS'], 
  ARRAY['TRAUMA_SURGEON']
),
(
  'Continental Hospitals (Gachibowli)', 
  17.4211, 78.3381, 
  4, 
  '{"O_NEG": 3, "A_POS": 10, "B_POS": 7, "AB_NEG": 3}', 
  ARRAY['VENTILATOR', 'ECMO', 'CT_SCANNER', 'DIALYSIS', 'CATH_LAB'], 
  ARRAY['CARDIOLOGIST', 'NEUROSURGEON', 'TRAUMA_SURGEON']
);

SELECT * FROM hospitals;

-- ========================================================
-- Table Name: reservations (Piece 1 & Piece 2 Token Lock)
-- ========================================================
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_condition TEXT NOT NULL,
    urgency_level TEXT NOT NULL,
    blood_group TEXT,
    lock_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT * FROM reservations;

