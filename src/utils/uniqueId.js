const formatDobForUniqueId = (dateOfBirth = "") => {
  const value = String(dateOfBirth || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}${month}${year}`;
  }

  return value.replace(/\D/g, "");
};

export const buildMobileDobUniqueId = ({ mobileNumber = "", dateOfBirth = "" } = {}) => {
  const cleanMobile = String(mobileNumber || "").replace(/\D/g, "").slice(-10);
  const cleanDob = formatDobForUniqueId(dateOfBirth);

  return cleanMobile && cleanDob ? `${cleanMobile}${cleanDob}` : "";
};
