import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe SDK krever Node.js-runtime (ikke Edge)
export const runtime = 'nodejs';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_URL?.startsWith('http')
    ? process.env.VERCEL_URL
    : `https://${process.env.VERCEL_URL}`;

const stripe = new Stripe(stripeSecret ?? '', /* no apiVersion -> unngår types feil */);

type LocationSlug = 'jens-zetlitz-gate' | 'saudagata' | 'torbjorn-hornkloves-gate';

const NOK_PER_NIGHT = 150;

function dateDiffInNights(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  const ms = end.getTime() - start.getTime();
  const nights = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, nights);
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    if (!stripeSecret) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY server environment variable' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      fullName: string;
      email: string;
      startDate: string; // yyyy-mm-dd
      endDate: string; // yyyy-mm-dd
      licensePlate?: string;
      noLicensePlate?: boolean;
      location: LocationSlug;
    };

    // Valider input enkelt og tydelig
    if (!body?.fullName || body.fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!body?.email || !isEmail(body.email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!body?.startDate || !body?.endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }
    if (!body?.location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    const nights = dateDiffInNights(body.startDate, body.endDate);
    if (nights <= 0) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const totalNok = nights * NOK_PER_NIGHT;
    const unitAmount = totalNok * 100; // NOK i øre til Stripe

    const description = [
      `Parking: ${body.location}`,
      `From ${body.startDate} to ${body.endDate} (${nights} night${nights > 1 ? 's' : ''})`,
      body.licensePlate ? `Plate: ${body.licensePlate.toUpperCase()}` : `Plate: pending`,
      `Name: ${body.fullName}`,
    ].join(' • ');

    const successUrl = `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/?cancelled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: body.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'nok',
            unit_amount: unitAmount,
            product_data: {
              name: 'Staysville Parking',
              description,
            },
          },
        },
      ],
      metadata: {
        location: body.location,
        startDate: body.startDate,
        endDate: body.endDate,
        nights: String(nights),
        licensePlate: body.noLicensePlate ? '' : (body.licensePlate || '').toUpperCase(),
        fullName: body.fullName,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    console.error('Booking error:', err);
    const message =
      err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
