/**
 * src/api/transbankApi.js
 *
 * Frontend API client for Transbank KYC proxy endpoints
 * served by sabbpegold backend at uatbckend.karatly.net
 */

const AUGMONT_BASE_URL = import.meta.env.VITE_AUGMONT_BASE_URL || "https://uatbckend.karatly.net";

const post = async (path, body) => {
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      "";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const res = await fetch(`${AUGMONT_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    return data;
  } catch (e) {
    if (e.name === "AbortError") {
      return { ok: false, message: "Request timed out. Please check your connection and try again." };
    }
    console.error(`transbankApi ${path} error:`, e);
    return { ok: false, message: "Network error. Please try again." };
  }
};

// ─── PAN Validation ──────────────────────────────────────────────────────────

export const transbankValidatePan = ({ panNumber, name, mobile }) =>
  post("/api/v1/kyc/pan/validate", { panNumber, name, mobile });

// ─── Aadhaar OKYC ────────────────────────────────────────────────────────────

export const transbankAadhaarGenerateOtp = (aadhaarNumber) =>
  post("/api/v1/kyc/aadhaar/generate-otp", { aadhaarNumber });

export const transbankAadhaarSubmitOtp = (sessionId, otp, uniqueId, aadhaarNumber) =>
  post("/api/v1/kyc/aadhaar/submit-otp", { sessionId, otp, uniqueId, aadhaarNumber });

// ─── Bank Account Validation ──────────────────────────────────────────────────

export const transbankValidateBankAccount = ({ accountName, accountNumber, ifscCode }) =>
  post("/api/v1/kyc/bank/validate", { accountName, accountNumber, ifscCode });
