import React from "react";
import { motion } from "framer-motion";

function MobileApp() {

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 60 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7 }
    }
  };

  const phoneFloat = {
    animate: {
      y: [0, -12, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section className="py-16 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 text-center">

        {/* Heading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-yellow-400 tracking-widest text-sm mb-3"
        >
          MOBILE APP
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-4xl lg:text-5xl font-bold mb-4"
        >
          Gold Investing in <span className="text-yellow-400">Your Pocket</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="text-white/60 max-w-2xl mx-auto mb-16"
        >
          Manage your gold portfolio on the go with our intuitive mobile
          experience
        </motion.p>

        {/* Phones */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid lg:grid-cols-3 gap-10 items-center justify-center"
        >

          {/* Phone 1 */}
          <motion.div variants={item} className="flex justify-center">
            <motion.div
              variants={phoneFloat}
              animate="animate"
              className="bg-neutral-900 p-4 rounded-3xl w-72 shadow-xl"
            >
              <div className="bg-black p-6 rounded-2xl">

                <p className="text-white/60 text-sm mb-2">Total Portfolio</p>
                <p className="text-3xl font-bold mb-1">₹2,45,830</p>
                <p className="text-green-400 text-sm mb-6">+12.4% all time</p>

                <div className="bg-neutral-900 p-4 rounded-xl mb-6">
                  <p className="text-white/60 text-sm">Digital Gold</p>
                  <p className="text-white font-semibold">₹2,45,830</p>
                  <p className="text-white/50 text-sm">37.5g</p>

                  <div className="h-2 bg-neutral-800 rounded-full mt-3">
                    <div className="h-2 bg-yellow-400 rounded-full w-3/4"></div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    className="flex-1 bg-yellow-400 text-black py-2 rounded-lg font-semibold"
                    onClick={() => {
                      const isLoggedIn = localStorage.getItem("isLoggedIn");
                      if (isLoggedIn === "true") {
                        window.location.href = "/dashboard?tab=buy";
                      } else {
                        window.location.href = "/login";
                      }
                    }}
                  >
                    Buy Gold
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    className="flex-1 bg-neutral-800 py-2 rounded-lg"
                    onClick={() => {
                      const isLoggedIn = localStorage.getItem("isLoggedIn");
                      if (isLoggedIn === "true") {
                        window.location.href = "/dashboard?tab=sell";
                      } else {
                        window.location.href = "/login";
                      }
                    }}
                  >
                    Sell Gold
                  </motion.button>
                </div>

              </div>
            </motion.div>
          </motion.div>

          {/* Phone 2 */}
          <motion.div variants={item} className="flex justify-center">
            <motion.div
              variants={phoneFloat}
              animate="animate"
              className="bg-neutral-900 p-4 rounded-3xl w-72 shadow-xl"
            >
              <div className="bg-black p-6 rounded-2xl">

                <p className="text-white/60 mb-4">Buy Digital Gold</p>

                <div className="bg-neutral-900 p-4 rounded-xl mb-4">
                  <p className="text-white/60 text-sm">Enter Amount</p>
                  <p className="text-3xl font-bold text-yellow-400">₹5,000</p>
                  <p className="text-white/50 text-sm">≈ 0.76 grams</p>
                </div>

                <div className="bg-neutral-900 p-4 rounded-xl text-sm mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span>Gold Rate</span>
                    <span>₹6,554/g</span>
                  </div>

                  <div className="flex justify-between">
                    <span>GST (3%)</span>
                    <span>₹150</span>
                  </div>

                  <div className="flex justify-between text-yellow-400 font-semibold">
                    <span>Total</span>
                    <span>₹5,150</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold"
                >
                  Buy Now
                </motion.button>

                <p className="text-white/40 text-xs text-center mt-3">
                  Secured by 256-bit encryption
                </p>

              </div>
            </motion.div>
          </motion.div>

          {/* Phone 3 */}
          <motion.div variants={item} className="flex justify-center">
            <motion.div
              variants={phoneFloat}
              animate="animate"
              className="bg-neutral-900 p-4 rounded-3xl w-72 shadow-xl"
            >
              <div className="bg-black p-6 rounded-2xl">

                <p className="text-white/60 mb-4">Investment Summary</p>

                <div className="bg-neutral-900 p-4 rounded-xl mb-4">
                  <p className="text-white/60 text-sm">Portfolio Value</p>
                  <p className="text-2xl font-bold">₹2,45,830</p>
                  <p className="text-green-400 text-sm">+₹27,200 returns</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between bg-neutral-900 p-3 rounded-lg">
                    <span>Total Invested</span>
                    <span>₹2,18,630</span>
                  </div>

                  <div className="flex justify-between bg-neutral-900 p-3 rounded-lg">
                    <span>Current Value</span>
                    <span>₹2,45,830</span>
                  </div>

                  <div className="flex justify-between bg-neutral-900 p-3 rounded-lg">
                    <span>Gold Held</span>
                    <span>37.5 grams</span>
                  </div>

                  <div className="flex justify-between bg-neutral-900 p-3 rounded-lg">
                    <span>Avg Buy Price</span>
                    <span>₹5,830/g</span>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}

export default MobileApp;