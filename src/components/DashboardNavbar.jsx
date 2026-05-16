import { NavLink, useNavigate } from "react-router-dom";

function DashboardNavbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  return (
    <div className="w-full bg-black border-b border-white/10 px-12 py-5 flex justify-between items-center">

      {/* LOGO */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-yellow-400 text-black flex items-center justify-center rounded-lg font-bold">
          SG
        </div>
        <h1 className="text-xl font-bold">
          <span className="text-white">SabPe</span>
          <span className="text-yellow-400"> Gold</span>
        </h1>
      </div>

      
      {/* ACTIONS */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate("/")}
          className="border border-yellow-400 px-4 py-2 rounded-full text-yellow-400"
        >
          Home
        </button>

        <button
          onClick={handleLogout}
          className="bg-yellow-400 text-black px-4 py-2 rounded-full"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default DashboardNavbar;