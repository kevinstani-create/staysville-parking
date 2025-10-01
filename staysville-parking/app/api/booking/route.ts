import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing env STRIPE_SECRET_KEY");
}
if (!APP_URL) {
  throw new Error("Missing env NEXT_PUBLIC_APP_URL");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

type BookingRequest = {
  fullName: string;
  email: string;
  startDate: string; // ISO: "YYYY-MM-DD"
  endDate: string;   // ISO: "YYYY-MM-DD"
  licensePlate?: string;
  noLicensePlate?: boolean;
  location: string;
};

function nightsBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  // avrund til midnatt for sikkerhets skyld
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const ms = end.getTime() - start.getTime();
  const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Math.max(1, d);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BookingRequest;

    // valider felter
    if (!body.fullName || !body.email || !body.startDate || !body.endDate || !body.location) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const nights = nightsBetween(body.startDate, body.endDate);
    const unitAmount = nights * 150 * 100; // 150 NOK per natt → øre

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: body.email,
      line_items: [
        {
          price_data: {
            currency: "nok",
            unit_amount: unitAmount,
            product_data: {
              name: `Parking at ${body.location}`,
              description: `${nights} night${nights > 1 ? "s" : ""}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/success`,
      cancel_url: `${APP_URL}/cancel`,
      metadata: {
        fullName: body.fullName,
        email: body.email,
        startDate: body.startDate,
        endDate: body.endDate,
        licensePlate: body.licensePlate ?? "N/A",
        noLicensePlate: String(Boolean(body.noLicensePlate)),
        location: body.location,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("booking/route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
