import { motion } from "framer-motion";
import { UserPlus, Wallet, Coins, Download } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create an Account",
    desc: "Sign up and verify your identity in minutes with a simple KYC process.",
    number: "01",
  },
  {
    icon: Wallet,
    title: "Add Funds",
    desc: "Securely add money through UPI, bank transfer, or digital payment methods.",
    number: "02",
  },
  {
    icon: Coins,
    title: "Buy Digital Gold",
    desc: "Purchase gold instantly at live market prices — start from as low as ₹10.",
    number: "03",
  },
  {
    icon: Download,
    title: "Sell Anytime",
    desc: "Sell your gold anytime and receive instant payouts directly to your bank.",
    number: "04",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-black text-white py-16 px-6 lg:px-20 relative overflow-hidden">

      {/* gold background glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-500 opacity-10 blur-[200px] rounded-full"></div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* label */}
        <p className="text-center text-yellow-400 tracking-widest font-semibold mb-4">
          SIMPLE PROCESS
        </p>

        {/* heading */}
        <h2 className="text-center text-4xl lg:text-5xl font-bold mb-4">
          How It <span className="text-yellow-400">Works</span>
        </h2>

        <p className="text-center text-gray-400 mb-16">
          Start investing in digital gold in just four simple steps
        </p>

        {/* cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative bg-gradient-to-b from-[#141414] to-[#0b0b0b] border border-gray-800 rounded-3xl p-10 hover:border-yellow-500/40 transition duration-300"
              >

                {/* background number */}
                <span className="absolute right-8 top-6 text-7xl font-bold text-gray-800 opacity-30">
                  {step.number}
                </span>

                {/* icon */}
                <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-yellow-500 text-black shadow-[0_0_30px_rgba(255,200,0,0.5)] mb-6">
                  <Icon size={28} />
                </div>

                {/* title */}
                <h3 className="text-xl font-semibold mb-3">
                  {step.title}
                </h3>

                {/* description */}
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.desc}
                </p>

              </motion.div>
            );
          })}

        </div>

      </div>
    </section>
  );
}