"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Small Business Owner",
    initials: "PS",
    rating: 5,
    text: "SabPe Gold made gold investing so simple. I started with just ₹500 and now have a growing portfolio."
  },
  {
    name: "Rajesh Kumar",
    role: "Software Engineer",
    initials: "RK",
    rating: 5,
    text: "The live price tracking and instant buy feature are fantastic. Truly trustworthy platform."
  },
  {
    name: "Anita Desai",
    role: "Teacher",
    initials: "AD",
    rating: 5,
    text: "Transparency and 24K purity guarantee won me over. Great experience!"
  },
  {
    name: "Vikram Patel",
    role: "Freelancer",
    initials: "VP",
    rating: 4,
    text: "Selling gold and getting instant payouts is a game changer."
  }
];

export default function Testimonials() {
  return (
    <section className="bg-black text-white py-8">
      <div className="max-w-7xl mx-auto px-4">

        {/* 🔥 HEADER */}
        <div className="mb-8">
          <p className="text-yellow-500 text-xs tracking-widest font-semibold">
            TESTIMONIALS
          </p>

          <h2 className="text-2xl md:text-3xl font-bold mt-2">
            Loved by <span className="text-yellow-400">Investors</span>
          </h2>
        </div>

        {/* 🔥 HORIZONTAL SCROLL */}
        <div className="flex gap-4 overflow-x-auto pb-4">

          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="min-w-[260px] max-w-[280px] bg-[#111] border border-white/10 rounded-xl p-4 hover:border-yellow-500/30 transition"
            >

              {/* ⭐ STARS */}
              <div className="flex mb-3">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    size={14}
                    className={`mr-1 ${
                      index < item.rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-600"
                    }`}
                  />
                ))}
              </div>

              {/* 💬 TEXT */}
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                {item.text}
              </p>

              {/* 👤 USER */}
              <div className="flex items-center gap-2">
                <div className="bg-yellow-500/10 text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold">
                  {item.initials}
                </div>

                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-gray-400 text-xs">{item.role}</p>
                </div>
              </div>

            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}