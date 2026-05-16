/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#facc15",
        goldDark: "#eab308",
      },

      boxShadow: {
        gold: "0 0 40px rgba(250,204,21,0.35)",
      },

      backgroundImage: {
        "gold-gradient":
          "linear-gradient(90deg, #facc15, #eab308, #f59e0b)",
      },
    },
  },
  plugins: [],
};