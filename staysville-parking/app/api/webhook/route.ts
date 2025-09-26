import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature', { timestamp: new Date().toISOString() });
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing checkout.session.completed', {
        sessionId: session.id,
        timestamp: new Date().toISOString()
      });

      // Update booking status to completed (idempotent)
      const pool = getPool();
      const result = await pool.query(
        `UPDATE bookings 
         SET status = 'completed' 
         WHERE stripe_payment_intent_id = $1 AND status = 'pending'
         RETURNING id, full_name, location, total_price`,
        [session.id]
      );

      if (result.rows.length > 0) {
        const booking = result.rows[0];
        console.log('Booking completed successfully', {
          bookingId: booking.id,
          customerName: booking.full_name,
          location: booking.location,
          totalPrice: booking.total_price / 100,
          sessionId: session.id,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn('No pending booking found for session', {
          sessionId: session.id,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log('Unhandled webhook event type', {
        eventType: event.type,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
