import "dotenv/config";
import express from "express";
import cors from "cors";
import bankRoutes from "./routes/banks.js";
import profileRoutes from "./routes/profile.js";

const app = express();
const PORT = process.env.SERVER_PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/v1/users/banks", bankRoutes);
app.use("/api/v1/users", profileRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Local server is running" });
});

app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
