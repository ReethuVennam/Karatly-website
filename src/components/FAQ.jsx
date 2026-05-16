
import { useState } from "react";

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Is digital gold safe?",
      answer:
        "Yes, digital gold is backed by physical gold stored in secure insured vaults with full transparency.",
    },
    {
      question: "What purity of gold does SabPe offer?",
      answer:
        "SabPe offers 24K 99.99% pure gold sourced from trusted LBMA approved refineries.",
    },
    {
      question: "Can I sell my gold anytime?",
      answer:
        "Yes, you can sell your digital gold anytime instantly at real-time market prices.",
    },
    {
      question: "Where is the gold stored?",
      answer:
        "Your gold is stored safely in insured vaults managed by trusted custodians.",
    },
    {
      question: "What is the minimum investment amount?",
      answer:
        "You can start investing in digital gold with as little as ₹10.",
    },
    {
      question: "Are there any hidden charges?",
      answer:
        "No hidden charges. SabPe maintains transparent pricing with minimal transaction fees.",
    },
  ];

  return (
    <section id="faq" className="py-20 bg-black">

      <div className="max-w-5xl mx-auto px-4">

        {/* Top label */}
        <p className="text-yellow-400 text-center font-semibold mb-2">
          FAQ
        </p>

        {/* Title */}
        <h2 className="text-4xl lg:text-5xl font-bold text-center mb-4">
          Frequently Asked{" "}
          <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Questions
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-gray-400 text-center mb-12">
          Everything you need to know about investing with SabPe Gold
        </p>

        {/* FAQ Cards */}
        <div className="space-y-4">

          {faqs.map((faq, index) => (

            <div
              key={index}
              className="bg-[#111] border border-white/10 rounded-xl p-6 transition hover:border-yellow-400/40"
            >

              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="flex justify-between items-center w-full text-left"
              >

                <span className="text-white font-medium text-lg">
                  {faq.question}
                </span>

                <span
                  className={`text-white transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                >
                  ⌄
                </span>

              </button>

              {openIndex === index && (
                <p className="text-gray-400 mt-4 leading-relaxed">
                  {faq.answer}
                </p>
              )}

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}

export default FAQ;