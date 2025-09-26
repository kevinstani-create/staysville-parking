import { Pool } from 'pg';

// Create a singleton pool instance for serverless environments
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export interface Booking {
  id: number;
  full_name: string;
  email: string;
  start_date: string;
  end_date: string;
  license_plate: string | null;
  no_license_plate: boolean;
  location: string;
  total_price: number;
  stripe_payment_intent_id: string | null;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface BookingStats {
  total: number;
  completed: number;
  pending: number;
  totalRevenue: number;
  locationCounts: {
    'jens-zetlitz-gate': number;
    'saudagata': number;
    'torbjorn-hornkloves-gate': number;
  };
}

// Location mapping for display names
export const LOCATION_NAMES = {
  'jens-zetlitz-gate': 'Jens Zetlitz gate',
  'saudagata': 'Saudagata',
  'torbjorn-hornkloves-gate': 'Torbjørn Hornkløves gate'
} as const;

export type LocationKey = keyof typeof LOCATION_NAMES;

// Validate location key
export function isValidLocation(location: string): location is LocationKey {
  return location in LOCATION_NAMES;
}

// Calculate nights between dates
export function calculateNights(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// Check capacity for Saudagata (max 2 overlapping bookings)
export async function checkSaudagataCapacity(
  startDate: string,
  endDate: string,
  excludeBookingId?: number
): Promise<boolean> {
  const pool = getPool();
  
  let query = `
    SELECT COUNT(*) as count
    FROM bookings 
    WHERE location = 'saudagata' 
    AND status = 'completed'
    AND (
      (start_date <= $1 AND end_date > $1) OR
      (start_date < $2 AND end_date >= $2) OR
      (start_date >= $1 AND end_date <= $2)
    )
  `;
  
  const params = [startDate, endDate];
  
  if (excludeBookingId) {
    query += ' AND id != $3';
    params.push(excludeBookingId.toString());
  }
  
  const result = await pool.query(query, params);
  const currentBookings = parseInt(result.rows[0].count);
  
  return currentBookings < 2;
}
