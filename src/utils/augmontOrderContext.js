import { getUserProfile, setUserProfile, validateToken } from "../api/authApi";
import {
  createAugmontAddress,
  createAugmontUser,
  fetchLiveGoldRateSnapshot,
  getAugmontUser,
  setAugmontUser
} from "../api/augmontApi";
import { buildMobileDobUniqueId } from "./uniqueId";

const DEFAULT_STATE = "Maharashtra";
const DEFAULT_CITY = "Mumbai";
const DEFAULT_PINCODE = "400001";

const buildUniqueId = (profile = {}, augmontUser = {}) => {
  // Priority 1: augmontUniqueId from validateToken (DB-backed, most reliable)
  const fromDb =
    profile?.uniqueId ||
    profile?.augmontUniqueId ||
    augmontUser?.uniqueId ||
    "";
  if (fromDb) return fromDb;

  // Priority 2: reconstruct from mobile + DOB (for users mid-session before validateToken)
  const mobileNumber = String(
    profile?.mobileNumber ||
    profile?.phoneNumber ||
    augmontUser?.mobileNumber ||
    ""
  ).replace(/\D/g, "").slice(-10);

  const dateOfBirth =
    profile?.dateOfBirth ||
    profile?.dob ||
    augmontUser?.dateOfBirth ||
    "";

  if (mobileNumber && dateOfBirth) {
    return buildMobileDobUniqueId({ mobileNumber, dateOfBirth });
  }

  // Priority 3: KTL-mobile fallback
  if (mobileNumber) return `KTL-${mobileNumber}`;

  return "";
};

const isExistingUserResponse = (response = {}) => {
  const message = String(
    response?.message ||
      response?.raw?.payload?.message ||
      response?.raw?.message ||
      ""
  ).toLowerCase();
  const statusCode = String(
    response?.statusCode ||
      response?.raw?.payload?.statusCode ||
      response?.raw?.statusCode ||
      ""
  );

  return (
    statusCode === "409" ||
    statusCode === "422" ||
    message.includes("already") ||
    message.includes("exist") ||
    message.includes("taken")
  );
};

export const ensureAugmontUserForOrder = async () => {
  // Refresh profile from auth backend to pick up any server-assigned uniqueId
  await validateToken().catch(() => {});

  const profile = getUserProfile() || {};
  const augmontUser = getAugmontUser() || {};
  const uniqueId = buildUniqueId(profile, augmontUser);
  const mobileNumber = String(
    profile?.mobileNumber || augmontUser?.mobileNumber || ""
  )
    .replace(/\D/g, "")
    .slice(-10);
  const emailId = String(
    profile?.email || profile?.emailId || augmontUser?.emailId || ""
  ).trim();
  const userName = String(
    profile?.fullName ||
      augmontUser?.userName ||
      emailId.split("@")[0] ||
      `User ${mobileNumber.slice(-4)}`
  ).trim();

  if (!uniqueId) {
    throw new Error("Augmont uniqueId is missing. Please log in again.");
  }

  if (!mobileNumber || !emailId || !userName) {
    throw new Error("User mobile number, email, or name is missing.");
  }

  const userRequest = {
    mobileNumber,
    emailId,
    uniqueId,
    userName,
    stateName: profile?.augmontState || augmontUser?.stateName || DEFAULT_STATE,
    cityName: profile?.augmontCity || augmontUser?.cityName || DEFAULT_CITY,
    userPincode: profile?.pinCode || augmontUser?.userPincode || DEFAULT_PINCODE
  };

  // Do not call Augmont user create API here. The sell flow should
  // directly call `/api/v1/orders/sell/create`. Persist local profile
  // data so downstream code can include uniqueId in the sell request.
  setUserProfile({
    fullName: userName,
    email: emailId,
    mobileNumber,
    uniqueId,
    pinCode: userRequest.userPincode,
    augmontState: userRequest.stateName,
    augmontCity: userRequest.cityName
  });

  setAugmontUser({
    ...augmontUser,
    ...userRequest,
    profileExists: Boolean(uniqueId)
  });

  return {
    uniqueId,
    user: userRequest,
    createResponse: null
  };
};

export const ensureAugmontAddressForOrder = async ({ uniqueId, user }) => {
  const profile = getUserProfile() || {};
  const augmontUser = getAugmontUser() || {};
  const address = String(
    profile?.augmontAddress ||
      augmontUser?.address ||
      augmontUser?.fullAddress ||
      ""
  ).trim();
  const pincode = String(
    profile?.pinCode || user?.userPincode || augmontUser?.userPincode || ""
  ).trim();

  let resolvedAddress = address;
  if (!resolvedAddress) {
    const parts = [
      profile?.augmontAddress || "",
      profile?.augmontLandmark || "",
      profile?.augmontCity || profile?.city || "",
      profile?.augmontState || profile?.stateName || ""
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    resolvedAddress = parts.join(", ");
  }

  if (!resolvedAddress || !pincode) {
    throw new Error("User address and pincode are required before selling.");
  }

  const response = await createAugmontAddress({
    uniqueId,
    request: {
      name: user?.userName || profile?.fullName || "",
      mobileNumber: user?.mobileNumber || profile?.mobileNumber || "",
      email: user?.emailId || profile?.email || "",
      address: resolvedAddress,
      pincode
    }
  });

  if (!response?.ok && !isExistingUserResponse(response)) {
    throw new Error(response?.message || "Unable to create or identify Augmont address.");
  }

  return {
    address,
    pincode,
    response
  };
};

export const prepareAugmontOrderContext = async (side = "buy") => {
  const userContext = await ensureAugmontUserForOrder();
  const addressContext =
    side === "sell"
      ? await ensureAugmontAddressForOrder(userContext)
      : null;
  const rateResponse = await fetchLiveGoldRateSnapshot({ allowNetwork: true, force: true });
  const snapshot = rateResponse?.snapshot || {};
  const price =
    side === "sell"
      ? Number(snapshot.sellPrice || 0)
      : Number(snapshot.buyPrice || 0);
  const blockId = String(snapshot.blockId || rateResponse?.blockId || "").trim();

  if (!rateResponse?.ok || price <= 0) {
    throw new Error(
      rateResponse?.message ||
        `Live ${side === "sell" ? "sell" : "buy"} rate is unavailable.`
    );
  }

  if (!blockId) {
    throw new Error("Live rate blockId is missing. Please refresh and try again.");
  }

  return {
    ...userContext,
    rate: price,
    blockId,
    snapshot,
    rateResponse,
    addressContext
  };
};
