"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Globe,
  Smartphone,
  TrendingUp,
  Calculator
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Trusted Fintech Platform",
    desc: "Regulated and compliant with Indian financial standards, trusted by lakhs of users."
  },
  {
    icon: Globe,
    title: "International Bullion Standards",
    desc: "Gold sourced and refined following internationally recognized bullion standards."
  },
  {
    icon: ShieldCheck,
    title: "Secure & Insured Vaults",
    desc: "Your gold is stored in world-class vaults with full insurance coverage."
  },
  {
    icon: Smartphone,
    title: "Easy Digital Transactions",
    desc: "Buy, sell, and manage your gold portfolio seamlessly from your smartphone."
  },
  {
    icon: TrendingUp,
    title: "Long-Term Wealth Protection",
    desc: "Gold has been a proven wealth protector for centuries — now in digital form."
  }
];

export default function WhySabpeGold() {
  return (
    <section className="bg-black text-white py-16">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16">

        {/* LEFT CONTENT */}

        <div>
          <p className="text-yellow-500 font-semibold tracking-widest mb-3">
            WHY SABPE GOLD
          </p>

          <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
            The Smarter Way to <span className="text-yellow-400">Own Gold</span>
          </h2>

          <p className="text-gray-400 mt-6 mb-10 max-w-lg">
            SabPe Gold combines the timeless value of gold with the convenience
            of modern technology. Experience a new standard in digital gold
            investment.
          </p>

          <div className="space-y-8">
            {features.map((item, i) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="bg-yellow-500/10 p-2 rounded-xl text-yellow-400">
                    <Icon size={20} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg">
                      {item.title}
                    </h4>

                    <p className="text-gray-400 text-sm mt-1 max-w-md">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT STATS PANEL */}

        

<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  whileInView={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.6 }}
  className="bg-[#111] border border-white/10 rounded-3xl p-6 h-fit shadow-[0_0_120px_rgba(255,190,0,0.08)]"
>

  <div className="grid grid-cols-2 gap-4">

    <div className="bg-[#171717] rounded-2xl p-4 text-center">
      <h3 className="text-yellow-400 text-2xl font-bold">99.99%</h3>
      <p className="mt-1 font-medium text-sm">Gold Purity</p>
      <span className="text-gray-400 text-xs">24 Karat</span>
    </div>

    <div className="bg-[#171717] rounded-2xl p-4 text-center">
      <h3 className="text-yellow-400 text-2xl font-bold">100%</h3>
      <p className="mt-1 font-medium text-sm">Vault Insurance</p>
      <span className="text-gray-400 text-xs">Fully Covered</span>
    </div>

    <div className="bg-[#171717] rounded-2xl p-4 text-center">
      <h3 className="text-yellow-400 text-2xl font-bold">₹10</h3>
      <p className="mt-1 font-medium text-sm">Min Investment</p>
      <span className="text-gray-400 text-xs">Start Small</span>
    </div>

    <div className="bg-[#171717] rounded-2xl p-4 text-center">
      <h3 className="text-yellow-400 text-2xl font-bold">Instant</h3>
      <p className="mt-1 font-medium text-sm">Withdrawal</p>
      <span className="text-gray-400 text-xs">24/7 Available</span>
    </div>

  </div>

  {/* SECURITY BAR */}

  <div className="mt-6">

    <div className="flex justify-between text-xs mb-2">
      <span className="text-gray-400">Security Rating</span>
      <span className="text-yellow-400 font-semibold">A+ Grade</span>
    </div>

    <div className="w-full bg-[#222] rounded-full h-2">
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full w-[92%]" />
    </div>

  </div>

</motion.div>

      </div>
    </section>
  );
}