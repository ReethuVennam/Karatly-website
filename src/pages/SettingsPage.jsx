import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { getUserProfile } from "../api/authApi";

export default function Settings() {
  const userProfile = useMemo(() => getUserProfile() || {}, []);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notifications, setNotifications] = useState(true);

  const displayEmail = userProfile?.email || "No email available";
  const displayPhone = userProfile?.mobileNumber || "No phone available";
  const kycStatus = userProfile?.augmontKycStatus || "Pending";
  const isKycVerified = /verified|approved|completed/i.test(kycStatus);

  const handlePasswordUpdate = () => {
    if (!password || !newPassword) {
      alert("Please fill all fields");
      return;
    }

    alert("Password updated successfully.");
    setPassword("");
    setNewPassword("");
  };

  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      <div className="pt-28 px-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Current Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black border border-white/20 px-4 py-3 rounded-lg outline-none"
            />

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-black border border-white/20 px-4 py-3 rounded-lg outline-none"
            />
          </div>

          <button
            onClick={handlePasswordUpdate}
            className="mt-5 bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:scale-105 transition"
          >
            Update Password
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-sm text-white/60">
              Email & SMS alerts for transactions
            </p>
          </div>

          <button
            onClick={() => setNotifications(!notifications)}
            className={`px-5 py-2 rounded-full ${
              notifications
                ? "bg-green-500 text-black"
                : "bg-gray-600 text-white"
            }`}
          >
            {notifications ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Account Info</h2>

          <p className="text-white/70">Email: {displayEmail}</p>
          <p className="text-white/70">Phone: {displayPhone}</p>
          <p className={`mt-2 ${isKycVerified ? "text-green-400" : "text-yellow-300"}`}>
            KYC Status: {kycStatus}
          </p>
        </div>
      </div>
    </div>
  );
}
