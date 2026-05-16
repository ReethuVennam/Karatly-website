import Navbar from "../components/Navbar";
import { useState } from "react";

export default function HelpSupport() {
  const [open, setOpen] = useState(null);

  const faqs = [
    {
      q: "How do I buy gold?",
      a: "Go to dashboard → enter amount → click buy. Gold is instantly added."
    },
    {
      q: "Is my gold safe?",
      a: "Yes, your gold is stored in insured vaults with 100% security."
    },
    {
      q: "How do I sell gold?",
      a: "You can sell anytime and money is credited instantly."
    },
  ];

  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      <div className="pt-28 px-6 max-w-5xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">Help & Support</h1>

        {/* CONTACT CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-semibold mb-2">Email Support</h3>
            <p className="text-white/70">support@sabpegold.com</p>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-semibold mb-2">Call Us</h3>
            <p className="text-white/70">+91 98765 43210</p>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-semibold mb-2">Live Chat</h3>
            <p className="text-white/70">Available 24/7</p>
          </div>

        </div>

        {/* FAQ */}
        <h2 className="text-xl font-semibold mb-4">FAQs</h2>

        <div className="space-y-4">
          {faqs.map((item, i) => (
            <div
              key={i}
              className="border border-white/10 rounded-lg p-4 cursor-pointer"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <div className="flex justify-between">
                <p>{item.q}</p>
                <span>{open === i ? "-" : "+"}</span>
              </div>

              {open === i && (
                <p className="text-white/70 mt-3">{item.a}</p>
              )}
            </div>
          ))}
        </div>

        {/* CONTACT FORM */}
        <div className="mt-12 bg-white/5 p-6 rounded-xl border border-white/10">
          <h3 className="text-lg font-semibold mb-4">Raise a Ticket</h3>

          <input
            placeholder="Your Email"
            className="w-full mb-4 p-3 bg-black border border-white/20 rounded"
          />

          <textarea
            placeholder="Describe your issue"
            className="w-full mb-4 p-3 bg-black border border-white/20 rounded"
          />

          <button className="bg-yellow-400 text-black px-6 py-3 rounded font-semibold">
            Submit Request
          </button>
        </div>

      </div>
    </div>
  );
}