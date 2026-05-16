import Navbar from "../components/Navbar";
import Whysabbpegold from "../components/Whysabbpegold";

export default function WhyPage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      <div className="pt-28 px-6">
        <Whysabbpegold />
      </div>
    </div>
  );
}