import { NextRequest, NextResponse } from 'next/server';
import { getPool, checkSaudagataCapacity, calculateNights, isValidLocation, LOCATION_NAMES } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 apiVersion: '2025-08-27.basil',
});

// Rate limiting (simple in-memory store)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      console.error('Rate limit exceeded', { ip, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { fullName, email, startDate, endDate, licensePlate, noLicensePlate, location } = body;

    // Validate required fields
    if (!fullName || !email || !startDate || !endDate || !location) {
      console.error('Missing required fields', { 
        body: { ...body, email: body.email ? 'REDACTED' : undefined },
        timestamp: new Date().toISOString() 
      });
      return NextResponse.json(
        { error: 'Missing required fields: fullName, email, startDate, endDate, location' },
        { status: 400 }
      );
    }

    // Validate location
    if (!isValidLocation(location)) {
      console.error('Invalid location', { location, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { error: 'Invalid location. Must be one of: jens-zetlitz-gate, saudagata, torbjorn-hornkloves-gate' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format', { timestamp: new Date().toISOString() });
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Floor times to midnight
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Invalid date format', { startDate, endDate, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end <= start) {
      console.error('End date must be after start date', { startDate, endDate, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      console.error('Start date cannot be in the past', { startDate, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    // Calculate nights and price
    const nights = calculateNights(startDate, endDate);
    const totalPrice = nights * 150 * 100; // 150 NOK per night in øre

    // Check Saudagata capacity
    if (location === 'saudagata') {
      const hasCapacity = await checkSaudagataCapacity(startDate, endDate);
      if (!hasCapacity) {
        console.error('Saudagata capacity exceeded', { 
          startDate, 
          endDate, 
          timestamp: new Date().toISOString() 
        });
        return NextResponse.json(
          { error: 'No availability for selected dates at Saudagata. Maximum 2 cars allowed per overlapping period.' },
          { status: 400 }
        );
      }
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: `Parking at ${LOCATION_NAMES[location]}`,
              description: `${nights} night${nights > 1 ? 's' : ''} (${startDate} to ${endDate})`,
            },
            unit_amount: totalPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/${location}`,
      customer_email: email,
      metadata: {
        fullName,
        email,
        startDate,
        endDate,
        location,
        licensePlate: licensePlate || '',
        noLicensePlate: noLicensePlate ? 'true' : 'false',
      },
    });

    // Insert pending booking into database
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO bookings (
        full_name, email, start_date, end_date, license_plate, no_license_plate, 
        location, total_price, stripe_payment_intent_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        fullName,
        email,
        startDate,
        endDate,
        licensePlate || null,
        noLicensePlate || false,
        location,
        totalPrice,
        session.id,
        'pending'
      ]
    );

    console.log('Booking created', {
      bookingId: result.rows[0].id,
      location,
      nights,
      totalPrice: totalPrice / 100,
      sessionId: session.id,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Booking API error', {
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
