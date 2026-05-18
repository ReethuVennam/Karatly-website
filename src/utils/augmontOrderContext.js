import { getUserProfile, setUserProfile } from "../api/authApi";
import {
  createAugmontAddress,
  createAugmontUser,
  fetchLiveGoldRateSnapshot,
  getAugmontUser,
  setAugmontUser
} from "../api/augmontApi";

const DEFAULT_STATE = "Maharashtra";
const DEFAULT_CITY = "Mumbai";
const DEFAULT_PINCODE = "400001";

const buildUniqueId = (profile = {}, augmontUser = {}) => {
  const mobileNumber = String(
    profile?.mobileNumber ||
    profile?.phoneNumber ||
    augmontUser?.mobileNumber ||
    augmontUser?.phoneNumber ||
    ""
  )
    .replace(/\D/g, "")
    .slice(-10);

  if (mobileNumber) return `KTL-${mobileNumber}`;

  const fallbackDigits = String(
    profile?.uniqueId ||
    profile?.augmontUniqueId ||
    augmontUser?.uniqueId ||
    augmontUser?.customerMappedId ||
    localStorage.getItem("userUniqueId") ||
    ""
  )
    .replace(/\D/g, "")
    .slice(-10);

  return fallbackDigits;
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

  const response = await createAugmontUser(userRequest);

  if (!response?.ok && !isExistingUserResponse(response)) {
    throw new Error(response?.message || "Unable to create or identify Augmont user.");
  }

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
    profileExists: true
  });

  return {
    uniqueId,
    user: userRequest,
    createResponse: response
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

  if (!address || !pincode) {
    throw new Error("User address and pincode are required before selling.");
  }

  const response = await createAugmontAddress({
    uniqueId,
    request: {
      name: user?.userName || profile?.fullName || "",
      mobileNumber: user?.mobileNumber || profile?.mobileNumber || "",
      email: user?.emailId || profile?.email || "",
      address,
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
  const rateResponse = await fetchLiveGoldRateSnapshot({ allowNetwork: false });
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
