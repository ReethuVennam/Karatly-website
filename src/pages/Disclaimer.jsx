// import React from "react";

// function Disclaimer() {
//   return (
//     <div className="bg-black text-white min-h-screen py-28 px-6">
//       <div className="max-w-4xl mx-auto">

//         <h1 className="text-4xl font-bold text-yellow-400 mb-6">
//           Disclaimer
//         </h1>

//         <p className="text-white/70 mb-4">
//           SabPe Gold provides digital gold investment services. All investments
//           are subject to market risks and price fluctuations.
//         </p>

//         <p className="text-white/70 mb-4">
//           The information provided on this platform is for educational and
//           informational purposes only and should not be considered financial
//           advice.
//         </p>

//         <p className="text-white/70">
//           Users are advised to conduct their own research before making any
//           financial decisions.
//         </p>

//       </div>
//     </div>
//   );
// }

// export default Disclaimer;

import MainLayout from "../layouts/MainLayout";

function Disclaimer() {
  return (
    <MainLayout>

      <div className="max-w-4xl mx-auto px-6 py-16">

        <h1 className="text-4xl font-bold text-yellow-400 mb-6">
          Disclaimer
        </h1>

        <p className="text-white/70">
          Digital gold investments are subject to market risks and price
          fluctuations. Please read all related documents carefully before
          investing.
        </p>

      </div>

    </MainLayout>
  );
}

export default Disclaimer;