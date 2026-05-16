import { useNavigate } from "react-router-dom";

function CTA() {
  const navigate = useNavigate();

  const handleInvestClick = () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn === "true") {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="py-10 bg-black">
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative rounded-3xl border border-yellow-500/10 p-16 text-center overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0b0b0b]">

          <div className="relative z-10">

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Start Your Gold Journey <br />
              <span className="text-yellow-400">Today</span>
            </h2>

            <button
              onClick={handleInvestClick}   // ✅ IMPORTANT
              className="bg-yellow-400 text-black px-10 py-4 rounded-full"
            >
              Start Investing →
            </button>

          </div>
        </div>
      </div>
    </section>
  );
}

export default CTA;