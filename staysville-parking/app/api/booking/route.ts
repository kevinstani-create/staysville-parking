import { NextRequest, NextResponse } from 'next/server';
import { getPool, checkSaudagataCapacity, calculateNights, isValidLocation, LOCATION_NAMES } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16
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
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      location, 
      checkIn, 
      checkOut, 
      licensePlate,
      specialRequests 
    } = body;

    // Validation
    if (!name || !email || !phone || !location || !checkIn || !checkOut || !licensePlate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isValidLocation(location)) {
      return NextResponse.json(
        { error: 'Invalid location' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();

    if (checkInDate < now) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    const nights = calculateNights(checkInDate, checkOutDate);
    
    // Check capacity for Saudagata location
    if (location === 'saudagata') {
      const hasCapacity = await checkSaudagataCapacity(checkInDate, checkOutDate);
      if (!hasCapacity) {
        return NextResponse.json(
          { error: 'No parking spaces available for the selected dates at Saudagata location' },
          { status: 400 }
        );
      }
    }

    // Calculate price (example: 100 NOK per night)
    const pricePerNight = 100;
    const totalAmount = nights * pricePerNight;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: `Parking at ${LOCATION_NAMES[location]}`,
              description: `${nights} night${nights > 1 ? 's' : ''} parking from ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()}`,
            },
            unit_amount: totalAmount * 100, // Stripe expects amount in øre (cents)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking`,
      metadata: {
        name,
        email,
        phone,
        location,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        licensePlate,
        specialRequests: specialRequests || '',
        nights: nights.toString(),
        totalAmount: totalAmount.toString(),
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
