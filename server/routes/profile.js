import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.post("/profile-local", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.json({ ok: false, message: "mobile is required" });
    }
    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
    const [rows] = await pool.query(
      `SELECT
        client_id,
        provider_client_reference AS uniqueId,
        full_name AS fullName,
        email,
        mobile,
        date_of_birth AS dateOfBirth,
        city,
        state,
        pincode,
        kyc_status AS kycStatus,
        pan_verified AS panVerified,
        aadhaar_verified AS aadhaarVerified,
        bank_verified AS bankVerified
      FROM client_profile
      WHERE REPLACE(mobile, ' ', '') LIKE ?`,
      [`%${cleanMobile}`]
    );
    if (rows.length === 0) {
      return res.json({ ok: false, message: "User not found" });
    }
    return res.json({ ok: true, profile: rows[0] });
  } catch (error) {
    console.error("profile-local error:", error);
    return res.json({ ok: false, message: error.message });
  }
});

export default router;
