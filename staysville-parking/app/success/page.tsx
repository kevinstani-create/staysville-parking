"use client";

import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [message, setMessage] = useState("Processing your booking…");

  useEffect(() => {
    const t = setTimeout(() => {
      setMessage("✅ Payment successful! Your parking is booked.");
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50">
      <section className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-green-700 mb-3">Payment Success</h1>
        <p className="text-gray-700">{message}</p>
      </section>
    </main>
  );
}
