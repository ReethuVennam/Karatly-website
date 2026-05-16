import Navbar from "../components/Navbar";
import MobileApp from "../components/MobileApp";

export default function MobilePage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      {/* spacing below navbar */}
      <div className="pt-28 px-6">
        <MobileApp />
      </div>
    </div>
  );
}