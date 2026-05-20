/**
 * uniqueId.js
 *
 * Augmont uniqueId = mobile(10 digits) + DOB(ddmmyyyy) format
 * e.g. mobile=9958750013, dob=1985-12-13 → "995875001313121985"
 *
 * This is stored in client_profile.provider_client_reference by gold backend
 * and returned from validateToken as augmontUniqueId.
 * Frontend should ALWAYS use augmontUniqueId from validateToken — never reconstruct.
 */

const formatDobForUniqueId = (dateOfBirth = "") => {
  const value = String(dateOfBirth || "").trim();
  // yyyy-mm-dd → ddmmyyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}${month}${year}`;
  }
  return value.replace(/\D/g, "");
};

export const buildMobileDobUniqueId = ({ mobileNumber = "", dateOfBirth = "" } = {}) => {
  const cleanMobile = String(mobileNumber || "").replace(/\D/g, "").slice(-10);
  const cleanDob = formatDobForUniqueId(dateOfBirth);
  return cleanMobile && cleanDob ? `${cleanMobile}${cleanDob}` : cleanMobile ? `KTL-${cleanMobile}` : "";
};

// Fallback for when DOB is not available — used during login before validateToken completes
export const buildAugmontUniqueId = (mobileNumber = "") => {
  const cleanMobile = String(mobileNumber || "").replace(/\D/g, "").slice(-10);
  return cleanMobile ? `KTL-${cleanMobile}` : "";
};
