import { Award, Globe, Shield, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
const features = [
  {
    icon: Award,
    title: "24K 99.99% Purity",
    desc: "Highest quality gold standard",
  },
  {
    icon: Globe,
    title: "Indian Gold Bullion",
    desc: "International standards compliant",
  },
  {
    icon: Shield,
    title: "Insured Vaults",
    desc: "Fully insured digital gold",
  },
  {
    icon: Lock,
    title: "Secure Storage",
    desc: "International vault storage",
  },
  {
    icon: CheckCircle,
    title: "Verified Transactions",
    desc: "Bank-grade encryption",
  },
];

export default function Guarantee() {
  return (
    <section className="relative bg-black text-white py-10 px-6 lg:px-20 overflow-hidden">

      {/* BIG GOLD BACKGROUND GLOWS */}

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500 opacity-15 blur-[220px] rounded-full"></div>

      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-yellow-500 opacity-10 blur-[180px] rounded-full"></div>

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-yellow-500 opacity-10 blur-[180px] rounded-full"></div>


      <div className="relative z-10 max-w-7xl mx-auto">

        {/* top label */}

        <p className="text-center text-yellow-400 tracking-[4px] font-semibold mb-4">
          TRUSTED & CERTIFIED
        </p>

        {/* heading */}

        <h2 className="text-center text-4xl lg:text-5xl font-bold mb-16">
          Your Gold, Our{" "}
          <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
            Guarantee
          </span>
        </h2>

        {/* cards */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative bg-gradient-to-b from-[#141414] to-[#0b0b0b] border border-gray-800 rounded-3xl p-8 text-center hover:border-yellow-500/40 transition duration-300 group"
              >

                {/* CARD GOLD GLOW */}

                <div className="absolute -inset-6 bg-yellow-500 opacity-0 blur-[80px] rounded-3xl group-hover:opacity-20 transition"></div>


                {/* icon */}

                <div className="relative w-16 h-16 mx-auto flex items-center justify-center rounded-xl bg-yellow-500/10 mb-6 group-hover:bg-yellow-500/20 transition shadow-[0_0_20px_rgba(234,179,8,0.2)]">

                  <Icon size={30} className="text-yellow-400" />

                </div>

                {/* title */}

                <h3 className="text-lg font-semibold mb-2">
                  {feature.title}
                </h3>

                {/* description */}

                <p className="text-gray-400 text-sm">
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