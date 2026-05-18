const BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL?.trim() ||
  "https://uatauthbckend.karatly.net";
const USER_PROFILE_KEY = "userProfile";

const getJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      success: false,
      message: text || "Invalid server response"
    };
  }
};

const normalizeError = (error, fallbackMessage) => ({
  success: false,
  ok: false,
  message:
    error?.message === "Failed to fetch"
      ? `Cannot reach auth backend at ${BASE_URL}. Make sure the backend server is running and CORS allows this frontend origin.`
      : error?.message || fallbackMessage
});

const extractProfileFromAuthResponse = (data) => {
  // validateToken returns data.userInfo; other endpoints use data.user
  const user =
    data?.userInfo ||
    data?.user ||
    data?.payload?.user ||
    data?.payload?.result?.user ||
    data?.payload?.result?.data?.user ||
    data?.data?.user ||
    data?.result?.user ||
    {};

  return {
    fullName:
      user?.fullName ||
      user?.name ||
      user?.userName ||
      user?.username ||
      user?.customerName ||
      data?.fullName ||
      data?.name ||
      data?.payload?.fullName ||
      data?.payload?.name ||
      "",
    email:
      user?.email ||
      user?.emailId ||
      user?.mail ||
      data?.email ||
      data?.payload?.email ||
      "",
    mobileNumber:
      user?.mobileNumber ||
      user?.mobile ||
      user?.phone ||
      user?.phoneNumber ||
      user?.mobileNo ||
      data?.mobileNumber ||
      data?.payload?.mobileNumber ||
      "",
    pinCode:
      user?.pinCode ||
      user?.pincode ||
      user?.userPincode ||
      data?.pinCode ||
      data?.pincode ||
      data?.payload?.pinCode ||
      data?.payload?.pincode ||
      "",
    uniqueId:
      user?.augmontUniqueId ||
      user?.uniqueId ||
      user?.providerUserId ||
      data?.uniqueId ||
      data?.payload?.uniqueId ||
      "",
    partnerUserId:
      user?.partnerUserId ||
      data?.partnerUserId ||
      data?.payload?.partnerUserId ||
      "",
    panVerified:    user?.panVerified    || false,
    aadhaarVerified: user?.aadhaarVerified || false,
    bankVerified:   user?.bankVerified   || false,
    kycStatus:      user?.kycStatus      || "",
    profilePhoto:   user?.profilePhoto   || null,
  };
};

export const setAuthSession = (token) => {
  if (!token) return;
  localStorage.setItem("token", token);
  localStorage.setItem("isLoggedIn", "true");
  // Clear stale gold data from previous session
  localStorage.removeItem("goldBalance");
  localStorage.removeItem("goldPrice");
};

const buildDisplayName = ({ fullName, email, mobileNumber }) => {
  if (fullName?.trim()) return fullName.trim();
  if (email?.includes("@")) {
    const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (localPart) {
      return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }
  if (mobileNumber?.trim()) {
    return `User ${mobileNumber.trim().slice(-4)}`;
  }
  return "User";
};

export const getUserProfile = () => {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUserProfile = ({
  fullName = "",
  email = "",
  mobileNumber = "",
  pinCode = "",
  uniqueId = "",
  partnerUserId = "",
  customerMappedId = "",
  augmontStateId = "",
  augmontCityId = "",
  augmontState = "",
  augmontCity = "",
  augmontAddress = "",
  augmontLandmark = "",
  augmontUserAddressId = "",
  augmontKycStatus = "",
  augmontCreatedAt = "",
  panVerified = false,
  aadhaarVerified = false,
  bankVerified = false,
  kycStatus = "",
  profilePhoto = null,
} = {}) => {
  const existingProfile = getUserProfile();
  const nextProfile = {
    fullName:
      fullName?.trim() ||
      existingProfile?.fullName ||
      buildDisplayName({ fullName, email, mobileNumber }),
    email: email?.trim() || existingProfile?.email || "",
    mobileNumber: mobileNumber?.trim() || existingProfile?.mobileNumber || "",
    pinCode: pinCode?.trim() || existingProfile?.pinCode || "",
    uniqueId: uniqueId?.trim() || existingProfile?.uniqueId || "",
    partnerUserId:
      String(partnerUserId || "").trim() || existingProfile?.partnerUserId || "",
    customerMappedId:
      String(customerMappedId || "").trim() ||
      existingProfile?.customerMappedId ||
      "",
    augmontStateId:
      String(augmontStateId || "").trim() || existingProfile?.augmontStateId || "",
    augmontCityId:
      String(augmontCityId || "").trim() || existingProfile?.augmontCityId || "",
    augmontState:
      String(augmontState || "").trim() || existingProfile?.augmontState || "",
    augmontCity:
      String(augmontCity || "").trim() || existingProfile?.augmontCity || "",
    augmontAddress:
      String(augmontAddress || "").trim() || existingProfile?.augmontAddress || "",
    augmontLandmark:
      String(augmontLandmark || "").trim() || existingProfile?.augmontLandmark || "",
    augmontUserAddressId:
      String(augmontUserAddressId || "").trim() ||
      existingProfile?.augmontUserAddressId ||
      "",
    augmontKycStatus:
      String(augmontKycStatus || "").trim() ||
      existingProfile?.augmontKycStatus ||
      "",
    panVerified:    panVerified    || existingProfile?.panVerified    || false,
    aadhaarVerified: aadhaarVerified || existingProfile?.aadhaarVerified || false,
    bankVerified:   bankVerified   || existingProfile?.bankVerified   || false,
    kycStatus:      kycStatus      || existingProfile?.kycStatus      || "",
    profilePhoto:   profilePhoto   || existingProfile?.profilePhoto   || null,
    augmontCreatedAt:
      String(augmontCreatedAt || "").trim() ||
      existingProfile?.augmontCreatedAt ||
      ""
  };

  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextProfile));
  // Keep profilePhoto in separate key for backward compatibility
  if (nextProfile.profilePhoto) {
    localStorage.setItem("profilePhoto", nextProfile.profilePhoto);
  }
  return nextProfile;
};

export const clearAuthSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem(USER_PROFILE_KEY);
  localStorage.removeItem("goldBalance");
  localStorage.removeItem("primaryBank");
  localStorage.removeItem("profilePhoto");
  localStorage.removeItem("augmontUser");
  // Keep goldPrice, goldSellRate, goldSellRateTime — market data, not user-specific
};

export const getAuthToken = () => localStorage.getItem("token");

export const isAuthenticated = () =>
  localStorage.getItem("isLoggedIn") === "true" && Boolean(getAuthToken());

/* ── SEND OTP ────────────────────────────────────────────────── */
export const sendOtp = async ({
  mobileNumber,
  email,
  fullName,
  type = "login"
}) => {
  try {
    const endpoint =
      type === "register"
        ? "/auth/register/send-otp"
        : "/auth/login/send-otp";

    const body =
      type === "register"
        ? { mobileNumber, email, emailId: email, fullName, userName: fullName }
        : { mobileNumber, email };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await getJson(res);
    return { ok: res.ok, ...data };
  } catch (error) {
    console.error("Send OTP Error:", error);
    return normalizeError(error, "Unable to send OTP");
  }
};

/* ── VERIFY OTP ──────────────────────────────────────────────── */
// TC2: Single login per 24h — backend returns HTTP 403 on second login attempt.
// We detect it and return a clear SESSION_EXISTS code for Login.jsx to handle.
export const verifyOtp = async ({ mobileNumber, otp, type = "login", email, fullName }) => {
  try {
    const endpoint =
      type === "register"
        ? "/auth/register/verify-otp"
        : "/auth/login/verify-otp";

    // Register endpoint requires email + fullName; login requires mobileNumber + otp + email
    const body =
      type === "register"
        ? { mobileNumber, otp, type, email, emailId: email, fullName, userName: fullName }
        : { mobileNumber, otp, email };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await getJson(res);

    // ── TC2: 24h single-session block ────────────────────────
    if (res.status === 403) {
      const msg = String(
        data?.message || data?.payload?.message || ""
      ).toLowerCase();
      const is24hBlock =
        msg.includes("already logged in") ||
        msg.includes("24 hour") ||
        msg.includes("session") ||
        data?.code === "SESSION_EXISTS";

      if (is24hBlock) {
        return {
          ok: false,
          code: "SESSION_EXISTS",
          message:
            "You are already logged in on another device. Only one active session is allowed per 24 hours. Please try again later or contact support."
        };
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        message:
          data?.message ||
          data?.payload?.message ||
          `OTP verification failed (${res.status}).`
      };
    }

    // Extract token — try all known response shapes from the Karatly backend
    const token =
      data?.payload?.token ||
      data?.token ||
      data?.data?.token ||
      data?.payload?.result?.token ||
      null;

    if (!token) {
      return { ok: false, message: "No token returned from server." };
    }

    // Extract user info and uniqueId
    const userInfo =
      data?.payload?.user ||
      data?.user ||
      data?.data?.user ||
      data?.payload?.result?.user ||
      {};

    const uniqueId =
      data?.payload?.uniqueId ||
      data?.uniqueId ||
      userInfo?.uniqueId ||
      userInfo?.augmontUniqueId ||
      null;

    const partnerUserId =
      data?.payload?.partnerUserId ||
      data?.partnerUserId ||
      userInfo?.partnerUserId ||
      "";

    // Persist session
    setAuthSession(token);
    setUserProfile({
      fullName: userInfo?.fullName || userInfo?.name || userInfo?.userName || "",
      email: userInfo?.email || userInfo?.emailId || "",
      mobileNumber,
      uniqueId: uniqueId || "",
      partnerUserId
    });

    return { ok: true, token, userInfo, uniqueId, partnerUserId };
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return normalizeError(error, "Unable to verify OTP");
  }
};

/* ── VALIDATE TOKEN ──────────────────────────────────────────── */
export const validateToken = async () => {
  try {
    const token = getAuthToken();

    if (!token) {
      return { ok: false, valid: false, message: "No token found" };
    }

    const res = await fetch(`${BASE_URL}/auth/validate-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await getJson(res);
    const backendProfile = extractProfileFromAuthResponse(data);

    if (res.ok) {
      setUserProfile(backendProfile);
    }

    return { ok: res.ok, valid: res.ok, ...data };
  } catch (error) {
    console.error("Validate Token Error:", error);
    return normalizeError(error, "Unable to validate token");
  }
};
