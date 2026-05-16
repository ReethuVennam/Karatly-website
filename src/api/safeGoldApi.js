// src/api/safeGoldApi.js
// SafeGold is deprecated - Karatly uses Augmont only
// These stubs exist to prevent import errors in legacy code

export const fetchSafeGoldUserTransactions = async () => ({
  ok: false,
  message: "SafeGold is not supported on this platform."
});

export const fetchSafeGoldUserBalance = async () => ({
  ok: false,
  message: "SafeGold is not supported on this platform."
});

export const registerSafeGoldUser = async () => ({
  ok: false,
  message: "SafeGold is not supported on this platform."
});
