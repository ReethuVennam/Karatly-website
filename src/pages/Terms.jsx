// import React from "react";

// function Terms() {
//   return (
//     <div className="bg-black text-white min-h-screen py-28 px-6">
//       <div className="max-w-4xl mx-auto">

//         <h1 className="text-4xl font-bold text-yellow-400 mb-6">
//           Terms of Service
//         </h1>

//         <p className="text-white/70 mb-4">
//           By accessing and using SabPe Gold, you agree to comply with the
//           following terms and conditions.
//         </p>

//         <h2 className="text-xl font-semibold mt-8 mb-2">
//           Account Responsibility
//         </h2>

//         <p className="text-white/70 mb-4">
//           Users are responsible for maintaining the confidentiality of their
//           accounts and ensuring all activities under their account comply with
//           applicable laws.
//         </p>

//         <h2 className="text-xl font-semibold mt-8 mb-2">
//           Investment Risk
//         </h2>

//         <p className="text-white/70">
//           Gold prices fluctuate according to market conditions and SabPe Gold
//           does not guarantee profits or returns.
//         </p>

//       </div>
//     </div>
//   );
// }

// export default Terms;
import MainLayout from "../layouts/MainLayout";

function Terms() {
  return (
    <MainLayout>

      <div className="max-w-4xl mx-auto px-6 py-16">

        <h1 className="text-4xl font-bold text-yellow-400 mb-6">
          Terms of Service
        </h1>

        <p className="text-white/70 mb-4">
          By using SabPe Gold, you agree to comply with the following terms and
          conditions.
        </p>

      </div>

    </MainLayout>
  );
}

export default Terms;