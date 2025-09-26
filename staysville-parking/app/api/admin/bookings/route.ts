import { NextRequest, NextResponse } from 'next/server';
import { getPool, Booking, BookingStats, LOCATION_NAMES } from '@/lib/db';

// Basic Auth helper
function checkBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  
  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  return username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS;
}

export async function GET(request: NextRequest) {
  try {
    // Check Basic Auth if credentials are configured
    if (process.env.ADMIN_USER && process.env.ADMIN_PASS) {
      if (!checkBasicAuth(request)) {
        return new NextResponse('Unauthorized', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Admin Area"',
          },
        });
      }
    }

    const pool = getPool();
    
    // Get all bookings (latest first)
    const bookingsResult = await pool.query(
      `SELECT * FROM bookings ORDER BY created_at DESC`
    );
    
    const bookings: Booking[] = bookingsResult.rows;
    
    // Calculate stats
    const stats: BookingStats = {
      total: bookings.length,
      completed: bookings.filter(b => b.status === 'completed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      totalRevenue: bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + b.total_price, 0) / 100, // Convert from øre to NOK
      locationCounts: {
        'jens-zetlitz-gate': bookings.filter(b => b.location === 'jens-zetlitz-gate').length,
        'saudagata': bookings.filter(b => b.location === 'saudagata').length,
        'torbjorn-hornkloves-gate': bookings.filter(b => b.location === 'torbjorn-hornkloves-gate').length,
      }
    };

    // Sanitize bookings for display (remove sensitive data, keep only last 4 of license plate)
    const sanitizedBookings = bookings.map(booking => ({
      ...booking,
      license_plate: booking.license_plate 
        ? `****${booking.license_plate.slice(-4)}` 
        : null,
      total_price: booking.total_price / 100, // Convert to NOK for display
    }));

    console.log('Admin bookings accessed', {
      totalBookings: bookings.length,
      completedBookings: stats.completed,
      pendingBookings: stats.pending,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      bookings: sanitizedBookings,
      stats
    });

  } catch (error) {
    console.error('Admin API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
