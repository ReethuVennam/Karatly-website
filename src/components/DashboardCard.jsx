import React from "react";

function DashboardCard() {
  return (
    <div className="relative flex justify-center">

      {/* Glow Background */}
      <div className="absolute w-[500px] h-[500px] bg-yellow-500/25 blur-[120px] rounded-full"></div>

      {/* Main Card */}
      <div className="relative w-[360px] bg-[#0c0c0c] border border-yellow-500/30 rounded-3xl p-6 shadow-xl">

        {/* Top Badge */}
        <div className="absolute -top-5 right-6 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-5 py-2 rounded-xl text-sm font-semibold shadow-lg">
          <div>24K Pure</div>
          <div className="text-xs">99.99% Gold</div>
        </div>

        {/* Portfolio Section */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center mb-6">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-gray-400 text-sm">
              Your Gold Portfolio
            </span>

            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full">
              +12.4%
            </span>
          </div>

          <div className="text-3xl font-bold text-white mb-1">
            ₹2,45,830
          </div>

          <div className="text-gray-400 text-sm">
            37.5 grams
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">

          {/* Buy Gold */}
          <div className="flex items-center gap-4 bg-[#161616] p-4 rounded-xl hover:bg-[#1e1e1e] transition">
            <div className="w-10 h-10 flex items-center justify-center bg-black rounded-lg text-yellow-400 text-xl">
              🪙
            </div>

            <div>
              <div className="text-white font-medium">
                Buy Gold
              </div>

              <div className="text-gray-400 text-sm">
                From ₹10
              </div>
            </div>
          </div>

          {/* Live Price */}
          <div className="flex items-center gap-4 bg-[#161616] p-4 rounded-xl hover:bg-[#1e1e1e] transition">
            <div className="w-10 h-10 flex items-center justify-center bg-black rounded-lg text-yellow-400 text-xl">
              📈
            </div>

            <div>
              <div className="text-white font-medium">
                Live Price
              </div>

              <div className="text-gray-400 text-sm">
                ₹6,554/g
              </div>
            </div>
          </div>

          {/* Insured Vault */}
          <div className="flex items-center gap-4 bg-[#161616] p-4 rounded-xl hover:bg-[#1e1e1e] transition">
            <div className="w-10 h-10 flex items-center justify-center bg-black rounded-lg text-yellow-400 text-xl">
              🛡
            </div>

            <div>
              <div className="text-white font-medium">
                Insured Vault
              </div>

              <div className="text-gray-400 text-sm">
                100% Secure
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default DashboardCard;