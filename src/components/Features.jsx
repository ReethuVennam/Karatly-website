import { motion } from "framer-motion";
import { TrendingUp, Zap, Shield, Coins, Clock, Eye } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Price Tracking",
    desc: "Monitor gold prices live with up-to-the-minute market data and smart alerts.",
  },
  {
    icon: Zap,
    title: "Instant Gold Purchase",
    desc: "Buy digital gold instantly with just a tap — no waiting, no paperwork.",
  },
  {
    icon: Shield,
    title: "Secure Insured Storage",
    desc: "Your gold is stored in internationally certified, fully insured vaults.",
  },
  {
    icon: Coins,
    title: "Start from ₹10",
    desc: "Begin your gold investment journey with as little as ten rupees.",
  },
  {
    icon: Clock,
    title: "Sell Gold Anytime",
    desc: "Liquidate your gold holdings 24/7 and get instant bank payouts.",
  },
  {
    icon: Eye,
    title: "Transparent Pricing",
    desc: "No hidden fees or charges. What you see is exactly what you pay.",
  },
];

export default function Features() {
  return (
    <section className="bg-black text-white py-16 px-6 lg:px-20 relative overflow-hidden">

      {/* background gold glow */}
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-500 opacity-10 blur-[200px] rounded-full"></div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* label */}
        <p className="text-center text-yellow-400 tracking-widest font-semibold mb-4">
          PLATFORM FEATURES
        </p>

        {/* heading */}
        <h2 className="text-center text-4xl lg:text-5xl font-bold mb-4">
          Everything You Need to{" "}
          <span className="text-yellow-400">Invest</span>
        </h2>

        {/* subtitle */}
        <p className="text-center text-gray-400 mb-16">
          A complete digital gold investment experience built for modern investors
        </p>

        {/* cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="bg-gradient-to-b from-[#141414] to-[#0b0b0b] border border-gray-800 rounded-3xl p-10 hover:border-yellow-500/40 transition duration-300 group"
              >

                {/* icon */}
                <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-yellow-500/10 mb-6 group-hover:bg-yellow-500/20 transition">

                  <Icon size={26} className="text-yellow-400" />

                </div>

                {/* title */}
                <h3 className="text-xl font-semibold mb-3">
                  {feature.title}
                </h3>

                {/* description */}
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>

              </motion.div>
            );
          })}

        </div>

      </div>
    </section>
  );
}