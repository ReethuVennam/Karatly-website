import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Shield, Coins, Star } from "lucide-react";
import { fetchLiveGoldRateSnapshot } from "../api/augmontApi";

export default function Hero() {
  const navigate = useNavigate();
  const [livePrice, setLivePrice] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadHeroData = async () => {
      try {  
        const rateResponse = await fetchLiveGoldRateSnapshot();
        if (!isMounted) return;
        // augmontApi snapshot.buyPrice = gBuy from Augmont rates/live
        const currentPrice = rateResponse?.snapshot?.buyPrice || 0;
        if (currentPrice > 0) setLivePrice(currentPrice);
      } catch (error) {
        console.error("HERO DATA ERROR:", error);
      }
    };

    loadHeroData();
    return () => { isMounted = false; };
  }, []);

  const formattedLivePrice = useMemo(() => {
    if (!livePrice) return "Loading...";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(livePrice);
  }, [livePrice]);

  const handleInvestClick = () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn === "true") {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="relative min-h-[85vh] bg-black text-white flex items-center overflow-hidden px-4 lg:px-20 pt-20 lg:pt-28">
      <div className="absolute top-20 right-0 w-[400px] h-[400px] lg:w-[650px] lg:h-[650px] bg-yellow-500 opacity-20 blur-[180px] rounded-full" />
      <div className="absolute top-0 left-0 w-[250px] h-[250px] lg:w-[350px] lg:h-[350px] bg-yellow-500 opacity-10 blur-[140px] rounded-full" />

      <div className="grid lg:grid-cols-2 gap-10 items-center w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >
          {/* TC1 — Augmont powered badge */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 border border-yellow-500/40 text-yellow-400 px-4 py-2 rounded-full bg-yellow-500/5 text-sm">
              <TrendingUp size={14} />
              India's Trusted Digital Gold Platform
            </div>
            <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 rounded-full text-xs text-white/60">
              <img
  src="/images/augmont-logo.png"
  alt="Augmont"
  className="h-6 w-auto object-contain"
/>
              Powered by <span className="text-white font-semibold">Augmont Gold</span>
            </div>
          </div>

          <h1 className="text-3xl lg:text-6xl font-bold leading-tight">
            <span>Invest in </span>
            <span>Pure</span>
            <br />
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              Digital Gold
            </span>{" "}
            <span>with Karatly</span>
          </h1>

          <p className="text-gray-400 mt-4 max-w-lg text-sm lg:text-lg">
            Buy, sell, and securely store 24K 999 Pure gold anytime.
            Start your wealth journey today.
          </p>

          <div className="flex gap-4 mt-6 flex-wrap">
            <button
              onClick={handleInvestClick}
              className="relative flex items-center gap-2 bg-yellow-500 text-black px-6 py-3 rounded-full font-semibold overflow-hidden group text-sm"
            >
              <span className="absolute inset-0 bg-yellow-400 blur-xl opacity-40 group-hover:opacity-70 transition" />
              <span className="relative flex items-center gap-2">
                Start Investing
                <ArrowRight size={16} />
              </span>
            </button>

            <button
              onClick={() => navigate("/learn-more")}
              className="border border-white/20 px-6 py-3 rounded-full text-sm hover:border-yellow-400 hover:text-yellow-400 transition"
            >
              Learn More
            </button>
          </div>

          <div className="flex gap-8 mt-8 flex-wrap">
            <div>
              <p className="text-yellow-400 text-xl lg:text-3xl font-bold">5L+</p>
              <p className="text-gray-400 text-xs lg:text-sm">Investors</p>
            </div>
            <div>
              <p className="text-yellow-400 text-xl lg:text-3xl font-bold">₹500Cr+</p>
              <p className="text-gray-400 text-xs lg:text-sm">Traded</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-yellow-400 text-xl lg:text-3xl font-bold">
                4.9 <Star size={16} fill="currentColor" />
              </p>
              <p className="text-gray-400 text-xs lg:text-sm">Rating</p>
            </div>
          </div>

          {/* TC1 — Augmont partner banner */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20">
              <span className="text-xs font-bold text-yellow-400">AU</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                AUGMONT GOLDTECH PRIVATE LIMITED
              </p>
              <p className="text-xs text-white/40">
                Secured & regulated digital gold provider
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="absolute -inset-8 bg-yellow-500 opacity-20 blur-[120px] rounded-full" />

            <div className="relative bg-[#0f0f0f] border border-yellow-500/20 p-5 rounded-3xl w-[280px] lg:w-[340px] backdrop-blur-xl">
              <motion.div
                className="absolute -top-5 right-0 bg-yellow-400 text-black px-3 py-1 rounded-lg text-xs font-semibold"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                24K · 999 Pure
              </motion.div>

              <div className="bg-[#1a1a1a] p-4 rounded-xl mb-3">
                <p className="text-gray-400 text-xs">
                  Portfolio <span className="text-yellow-400 ml-1">+12%</span>
                </p>
                <p className="text-2xl font-bold">₹2,45,830</p>
                <p className="text-gray-500 text-xs">37.5g</p>
              </div>

              <div className="flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-xl mb-2">
                <Coins className="text-yellow-400" size={18} />
                <div>
                  <p className="text-sm font-semibold">Buy Gold</p>
                  <p className="text-gray-400 text-xs">From ₹5</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-xl mb-2">
                <TrendingUp className="text-yellow-400" size={18} />
                <div>
                  <p className="text-sm font-semibold">Live Price</p>
                  <p className="text-gray-400 text-xs">{formattedLivePrice}/g</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-xl mb-2">
                <Shield className="text-yellow-400" size={18} />
                <div>
                  <p className="text-sm font-semibold">Secure Vault</p>
                  <p className="text-gray-400 text-xs">100% Safe</p>
                </div>
              </div>

              {/* Augmont branding on card */}
              <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <span className="text-[10px] text-white/30">Powered by</span>
                <span className="text-[10px] font-semibold text-yellow-400/70">
                  AUGMONT GOLDTECH
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
