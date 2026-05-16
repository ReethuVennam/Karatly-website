import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, TrendingUp, Coins } from "lucide-react";

export default function LearnMore() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">

      {/* 🔥 BACKGROUND (FIXED) */}
      <div className="absolute inset-0 z-0">

        {/* base */}
        <div className="absolute inset-0 bg-black" />

        {/* right gold glow */}
        <div className="absolute right-[-120px] top-[120px] w-[500px] h-[500px] bg-yellow-400 opacity-30 blur-[160px] rounded-full" />

        {/* center glow */}
        <div className="absolute left-1/2 top-1/3 w-[400px] h-[400px] -translate-x-1/2 bg-yellow-500 opacity-20 blur-[140px] rounded-full" />

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1a1400] to-black opacity-90" />

      </div>

      {/* ✅ CONTENT (IMPORTANT) */}
      <div className="relative z-10">

        {/* 🔝 NAVBAR */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-white/10 backdrop-blur-md">
          <h1 className="text-xl font-semibold">
            SabPe <span className="text-yellow-400">Gold</span>
          </h1>

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/70 hover:text-yellow-400 transition"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
        </div>

        {/* 🚀 HERO */}
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold leading-tight"
          >
            Invest in{" "}
            <span className="text-yellow-400 drop-shadow-lg">
              Digital Gold
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-white/60 max-w-xl mx-auto text-lg"
          >
            Buy, sell and store 24K gold digitally with complete security,
            transparency and real-time pricing.
          </motion.p>

        </div>

        {/* 💎 FEATURES */}
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6 py-8">

          <motion.div
            whileHover={{ y: -8, scale: 1.03 }}
            className="bg-white/5 border border-yellow-400/20 rounded-2xl p-6 backdrop-blur-lg shadow-lg hover:shadow-yellow-400/20 transition"
          >
            <Shield className="text-yellow-400 mb-4" size={32} />
            <h3 className="text-lg font-semibold mb-2">Secure Vault</h3>
            <p className="text-white/60 text-sm">
              Your gold is stored in insured vaults with full safety and transparency.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -8, scale: 1.03 }}
            className="bg-white/5 border border-yellow-400/20 rounded-2xl p-6 backdrop-blur-lg shadow-lg hover:shadow-yellow-400/20 transition"
          >
            <TrendingUp className="text-yellow-400 mb-4" size={32} />
            <h3 className="text-lg font-semibold mb-2">Live Market Price</h3>
            <p className="text-white/60 text-sm">
              Invest anytime at real-time gold prices with zero hidden charges.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -8, scale: 1.03 }}
            className="bg-white/5 border border-yellow-400/20 rounded-2xl p-6 backdrop-blur-lg shadow-lg hover:shadow-yellow-400/20 transition"
          >
            <Coins className="text-yellow-400 mb-4" size={32} />
            <h3 className="text-lg font-semibold mb-2">Start Small</h3>
            <p className="text-white/60 text-sm">
              Begin your investment journey with as low as ₹10.
            </p>
          </motion.div>

        </div>

        {/* ⚡ HOW IT WORKS */}
        <div className="max-w-5xl mx-auto px-6 py-14">

          <h2 className="text-3xl font-semibold text-center mb-10">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            {[
              "Create your account instantly",
              "Add money securely via UPI / card",
              "Buy digital gold in seconds",
            ].map((step, i) => (

              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="bg-gradient-to-br from-yellow-400/10 to-transparent border border-yellow-400/20 rounded-xl p-6 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-yellow-400 text-black font-bold text-lg shadow-lg">
                  {i + 1}
                </div>

                <p className="text-white/70">{step}</p>
              </motion.div>

            ))}

          </div>

        </div>

        {/* 🟡 TRUST */}
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h3 className="text-2xl font-semibold mb-4">
            Trusted by Investors
          </h3>

          <p className="text-white/60">
            Join thousands of users investing in digital gold securely with
            SabPe Gold. Your wealth is protected with industry-grade security.
          </p>
        </div>

        {/* 🔻 FOOTER */}
        <div className="border-t border-white/10 text-center py-6 text-white/50 text-sm">
          © 2026 SabPe Gold • Premium Digital Gold Platform
        </div>

      </div>
    </div>
  );
}