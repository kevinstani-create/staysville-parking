-- Staysville Parking Database Schema
-- Create the bookings table with proper indexes

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    license_plate TEXT NULL,
    no_license_plate BOOLEAN DEFAULT FALSE,
    location TEXT NOT NULL CHECK (location IN ('jens-zetlitz-gate', 'saudagata', 'torbjorn-hornkloves-gate')),
    total_price INTEGER NOT NULL, -- NOK in øre (1 NOK = 100 øre)
    stripe_payment_intent_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_location ON bookings(location);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_payment_intent ON bookings(stripe_payment_intent_id);

-- Add some sample data for testing (optional)
-- INSERT INTO bookings (full_name, email, start_date, end_date, location, total_price, status) 
-- VALUES 
--   ('Test User', 'test@example.com', '2025-09-27', '2025-09-29', 'jens-zetlitz-gate', 30000, 'completed'),
--   ('Another User', 'user@example.com', '2025-09-28', '2025-09-30', 'saudagata', 30000, 'pending');
