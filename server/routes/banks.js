import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.post("/list-local", async (req, res) => {
  try {
    const { uniqueId } = req.body;
    if (!uniqueId) {
      return res.json({ ok: false, message: "uniqueId is required", banks: [] });
    }
    const [rows] = await pool.query(
      `SELECT
        bank_account_id AS userBankId,
        client_id AS uniqueId,
        provider_bank_id AS bankId,
        account_holder_name AS accountName,
        account_number AS accountNumber,
        ifsc_code AS ifscCode,
        status,
        is_primary AS isPrimary
      FROM client_bank_accounts
      WHERE client_id = ?
      ORDER BY created_at DESC`,
      [uniqueId]
    );
    return res.json({ ok: true, banks: rows });
  } catch (error) {
    console.error("list-local error:", error);
    return res.json({ ok: false, message: error.message, banks: [] });
  }
});

router.post("/create-local", async (req, res) => {
  try {
    const { uniqueId, request } = req.body;
    if (!uniqueId || !request) {
      return res.json({ ok: false, message: "uniqueId and request are required" });
    }
    const { accountName, accountNumber, ifscCode } = request;
    if (!accountName || !accountNumber || !ifscCode) {
      return res.json({ ok: false, message: "accountName, accountNumber, ifscCode are required" });
    }
    const [existing] = await pool.query(
      `SELECT bank_account_id FROM client_bank_accounts WHERE client_id = ? AND account_number = ?`,
      [uniqueId, accountNumber]
    );
    if (existing.length > 0) {
      return res.json({ ok: false, message: "Bank account with this number already exists" });
    }
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM client_bank_accounts WHERE client_id = ?`,
      [uniqueId]
    );
    const count = countResult[0].cnt;
    const isPrimary = count === 0 ? 1 : 0;
    const providerBankId = `LOCAL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const [result] = await pool.query(
      `INSERT INTO client_bank_accounts
        (client_id, provider, provider_bank_id, account_holder_name, account_number, ifsc_code, status, is_primary, request_payload)
      VALUES (?, 'AUGMONT', ?, ?, ?, ?, 'active', ?, ?)`,
      [
        uniqueId,
        providerBankId,
        accountName,
        accountNumber,
        ifscCode,
        isPrimary,
        JSON.stringify(req.body),
      ]
    );
    return res.json({
      ok: true,
      message: "Bank account created successfully",
      bank: {
        userBankId: String(result.insertId),
        uniqueId,
        accountName,
        accountNumber,
        ifscCode,
        isPrimary,
        status: "active",
      },
    });
  } catch (error) {
    console.error("create-local error:", error);
    return res.json({ ok: false, message: error.message });
  }
});

router.post("/update-local", async (req, res) => {
  try {
    const { uniqueId, userBankId, request } = req.body;
    if (!uniqueId || !userBankId || !request) {
      return res.json({ ok: false, message: "uniqueId, userBankId, and request are required" });
    }
    const { accountName, accountNumber, ifscCode } = request;
    const updates = [];
    const params = [];
    if (accountName !== undefined) { updates.push("account_holder_name = ?"); params.push(accountName); }
    if (accountNumber !== undefined) { updates.push("account_number = ?"); params.push(accountNumber); }
    if (ifscCode !== undefined) { updates.push("ifsc_code = ?"); params.push(ifscCode); }
    if (updates.length === 0) {
      return res.json({ ok: false, message: "No fields to update" });
    }
    params.push(userBankId, uniqueId);
    await pool.query(
      `UPDATE client_bank_accounts SET ${updates.join(", ")} WHERE bank_account_id = ? AND client_id = ?`,
      params
    );
    return res.json({ ok: true, message: "Bank account updated successfully" });
  } catch (error) {
    console.error("update-local error:", error);
    return res.json({ ok: false, message: error.message });
  }
});

router.post("/delete-local", async (req, res) => {
  try {
    const { uniqueId, userBankId } = req.body;
    if (!uniqueId || !userBankId) {
      return res.json({ ok: false, message: "uniqueId and userBankId are required" });
    }
    await pool.query(
      `DELETE FROM client_bank_accounts WHERE bank_account_id = ? AND client_id = ?`,
      [userBankId, uniqueId]
    );
    return res.json({ ok: true, message: "Bank account deleted successfully" });
  } catch (error) {
    console.error("delete-local error:", error);
    return res.json({ ok: false, message: error.message });
  }
});

router.post("/set-primary", async (req, res) => {
  try {
    const { userBankId } = req.body;
    if (!userBankId) {
      return res.json({ ok: false, message: "userBankId is required" });
    }
    const [rows] = await pool.query(
      `SELECT client_id FROM client_bank_accounts WHERE provider_bank_id = ? LIMIT 1`,
      [userBankId]
    );
    if (rows.length === 0) {
      return res.json({ ok: false, message: "Bank account not found" });
    }
    const clientId = rows[0].client_id;
    await pool.query(
      `UPDATE client_bank_accounts SET is_primary = 0 WHERE client_id = ?`,
      [clientId]
    );
    await pool.query(
      `UPDATE client_bank_accounts SET is_primary = 1 WHERE provider_bank_id = ?`,
      [userBankId]
    );
    return res.json({ ok: true, message: "Primary bank updated successfully" });
  } catch (error) {
    console.error("set-primary error:", error);
    return res.json({ ok: false, message: error.message });
  }
});

export default router;
