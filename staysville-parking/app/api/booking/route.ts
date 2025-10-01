import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

/**
 * Incoming payload validator (no `any`)
 */
const BookingSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  licensePlate: z.string().optional(),
  noLicensePlate: z.boolean().optional(),
  location: z.enum(['jens-zetlitz-gate', 'saudagata', 'torbjorn-hornkloves-gate']),
})

/**
 * Calculate nights from YYYY-MM-DD strings
 */
function calculateNights(startISO: string, endISO: string): number {
  const start = new Date(startISO + 'T00:00:00')
  const end = new Date(endISO + 'T00:00:00')
  const ms = end.getTime() - start.getTime()
  const nights = Math.ceil(ms / (1000 * 60 * 60 * 24))
  return Math.max(0, nights)
}

/**
 * POST /api/booking
 * Creates a Stripe Checkout Session and returns { url }
 */
export async function POST(req: Request) {
  try {
    // Validate env
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY on the server' },
        { status: 500 },
      )
    }

    const body = await req.json()
    const parsed = BookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data
    const nights = calculateNights(data.startDate, data.endDate)
    if (nights <= 0) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 },
      )
    }

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' })

    // Resolve our origin for success/cancel URLs (works on Vercel and locally)
    const origin =
      req.headers.get('origin') ??
      `${new URL(req.url).protocol}//${new URL(req.url).host}`

    // NOK uses 2 decimals; 150 NOK = 15000 øre
    const UNIT_PRICE_ORE = 15000

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      customer_email: data.email,
      metadata: {
        fullName: data.fullName,
        startDate: data.startDate,
        endDate: data.endDate,
        licensePlate: data.licensePlate ?? '',
        noLicensePlate: data.noLicensePlate ? 'true' : 'false',
        location: data.location,
        nights: String(nights),
      },
      line_items: [
        {
          quantity: nights,
          price_data: {
            currency: 'nok',
            unit_amount: UNIT_PRICE_ORE,
            product_data: {
              name: `Parking – ${data.location.replaceAll('-', ' ')}`,
              description: `${data.startDate} → ${data.endDate} (${nights} night${nights > 1 ? 's' : ''})`,
            },
          },
        },
      ],
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL' },
        { status: 500 },
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
