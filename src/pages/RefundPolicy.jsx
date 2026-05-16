// import React from "react";

// function RefundPolicy() {
//   return (
//     <div className="bg-black text-white min-h-screen py-28 px-6">
//       <div className="max-w-4xl mx-auto">

//         <h1 className="text-4xl font-bold text-yellow-400 mb-6">
//           Refund Policy
//         </h1>

//         <p className="text-white/70 mb-4">
//           All digital gold transactions are processed instantly at real-time
//           market prices.
//         </p>

//         <p className="text-white/70 mb-4">
//           Once a purchase is completed, it cannot be cancelled or refunded.
//           However, users can sell their gold at the current market rate at any
//           time.
//         </p>

//         <p className="text-white/70">
//           In case of technical issues or payment failures, refunds will be
//           processed within 5–7 working days.
//         </p>

//       </div>
//     </div>
//   );
// }

// export default RefundPolicy;
import MainLayout from "../layouts/MainLayout";

function RefundPolicy() {
  return (
    <MainLayout>

      <div className="max-w-4xl mx-auto px-6 py-16">

        <h1 className="text-4xl font-bold text-yellow-400 mb-6">
          Refund Policy
        </h1>

        <p className="text-white/70">
          Once a digital gold purchase is completed, transactions cannot be
          reversed. However, users can sell their gold anytime at the current
          market rate.
        </p>

      </div>

    </MainLayout>
  );
}

export default RefundPolicy;