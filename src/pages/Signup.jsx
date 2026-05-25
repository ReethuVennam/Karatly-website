import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Crown, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import RegistrationForm from "../components/RegistrationForm";
import { sendOtp, setUserProfile, verifyOtp, clearAuthSession } from "../api/authApi";
import {
  createAugmontAddress,
  createAugmontUser,
  setAugmontUser
} from "../api/augmontApi";
import { fetchCities, fetchStates } from "../api/goldUserRegistrationApi";
import { buildMobileDobUniqueId } from "../utils/uniqueId";

const initialFormValues = {
  userName: "",
  mobileNumber: "",
  emailId: "",
  stateName: "",
  cityName: "",
  address: "",
  landmark: "",
  userPincode: "",
  dateOfBirth: "",
  otp: ""
};

const mobileRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pincodeRegex = /^\d{6}$/;
const userNameRegex = /^[A-Za-z .']+$/;
const locationOptions = {
  Rajasthan: {
    cities: {
      Jaipur: "302001"
    }
  },
  Telangana: {
    cities: {
      Hyderabad: "500001"
    }
  }
};

const getPincodeForLocation = (stateName, cityName) =>
  locationOptions[stateName]?.cities?.[cityName] || "";

const isValidDate = (value) => {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
};

const pickMasterItemByName = (items, expectedName) => {
  const normalizedExpectedName = String(expectedName || "").trim().toLowerCase();
  return (
    items.find(
      (item) => String(item?.name || "").trim().toLowerCase() === normalizedExpectedName
    ) ||
    items[0] ||
    null
  );
};

const buildValidationErrors = (values, otpSent = false) => {
  const errors = {};

  if (!values.userName.trim()) {
    errors.userName = "Full name is required";
  } else if (!userNameRegex.test(values.userName.trim())) {
    errors.userName = "Use only letters, spaces, dot, and single quotes";
  }

  if (!mobileRegex.test(values.mobileNumber.trim())) {
    errors.mobileNumber = "Enter a valid 10-digit mobile number";
  }

  if (!emailRegex.test(values.emailId.trim())) {
    errors.emailId = "Enter a valid email address";
  }

  if (!locationOptions[values.stateName]) {
    errors.stateName = "Select a state";
  }

  if (!getPincodeForLocation(values.stateName, values.cityName)) {
    errors.cityName = "Select a city";
  }

  if (values.address.trim().length <= 10) {
    errors.address = "Address must be more than 10 characters";
  }

  if (!values.landmark.trim()) {
    errors.landmark = "Enter a landmark";
  }

  if (!pincodeRegex.test(values.userPincode.trim())) {
    errors.userPincode = "Enter a valid 6-digit pincode";
  }

  if (!isValidDate(values.dateOfBirth)) {
    errors.dateOfBirth = "Select a valid date of birth";
  }

  if (otpSent && !values.otp.trim()) {
    errors.otp = "Enter the OTP";
  }

  return errors;
};

const sanitizeValue = (name, value) => {
  if (name === "mobileNumber" || name === "userPincode" || name === "otp") {
    return value.replace(/\D/g, "");
  }
  return value;
};

export default function Signup() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState(initialFormValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [signupWarning, setSignupWarning] = useState("");

  const handleChange = (name, value) => {
    const nextValue = sanitizeValue(name, value);

    setFormValues((current) => {
      if (name === "stateName") {
        return {
          ...current,
          stateName: nextValue,
          cityName: "",
          userPincode: ""
        };
      }

      if (name === "cityName") {
        return {
          ...current,
          cityName: nextValue,
          userPincode: getPincodeForLocation(current.stateName, nextValue)
        };
      }

      return {
        ...current,
        [name]: nextValue
      };
    });

    setErrors((current) => {
      const dependentFields =
        name === "stateName" ? ["stateName", "cityName", "userPincode"] : [name];
      if (!dependentFields.some((field) => current[field])) return current;
      const nextErrors = { ...current };
      dependentFields.forEach((field) => {
        delete nextErrors[field];
      });
      return nextErrors;
    });

    if (name === "otp" && submitError) {
      setSubmitError("");
    }
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    const validationErrors = buildValidationErrors(formValues, false);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please complete the required registration details");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const response = await sendOtp({
      email: formValues.emailId.trim(),
      mobileNumber: formValues.mobileNumber.trim(),
      fullName: formValues.userName.trim(),
      type: "register"
    });

    setSubmitting(false);

    if (!response?.ok) {
      if (response?.alreadyRegistered) {
        setAlreadyRegistered(true);
        setSubmitError(response?.message || "This mobile is already registered.");
        toast.error(response?.message || "Already registered");
        return;
      }
      const message = response?.message || "Failed to send OTP";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setOtpSent(true);
    toast.success(response?.message || "OTP sent successfully");
  };

  const handleVerifyAndCreate = async (event) => {
    event.preventDefault();
    const validationErrors = buildValidationErrors(formValues, true);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSignupWarning("");

    const verifyResponse = await verifyOtp({
      fullName: formValues.userName.trim(),
      email: formValues.emailId.trim(),
      mobileNumber: formValues.mobileNumber.trim(),
      otp: formValues.otp.trim(),
      dateOfBirth: formValues.dateOfBirth,
      type: "register"
    });

    if (!verifyResponse?.ok || !verifyResponse?.token) {
      const message = verifyResponse?.message || "OTP verification failed";
      setSubmitting(false);
      setSubmitError(message);
      toast.error(message);
      return;
    }

    // Auto-generate uniqueId from mobile number + DOB - never entered by user
    const autoUniqueId = buildMobileDobUniqueId({
      mobileNumber: formValues.mobileNumber,
      dateOfBirth: formValues.dateOfBirth
    });

    const stateResponse = await fetchStates(formValues.stateName.trim());
    const selectedState = pickMasterItemByName(
      stateResponse?.states || [],
      formValues.stateName
    );

    if (!stateResponse?.ok || !selectedState?.id) {
      const message = stateResponse?.message || "Unable to find selected state.";
      setSubmitting(false);
      setSubmitError(message);
      toast.error(message);
      return;
    }

    const cityResponse = await fetchCities(
      selectedState.id,
      formValues.cityName.trim()
    );
    const selectedCity = pickMasterItemByName(
      cityResponse?.cities || [],
      formValues.cityName
    );

    if (!cityResponse?.ok || !selectedCity?.id) {
      const message = cityResponse?.message || "Unable to find selected city.";
      setSubmitting(false);
      setSubmitError(message);
      toast.error(message);
      return;
    }

    const augmontResponse = await createAugmontUser({
      mobileNumber: formValues.mobileNumber.trim(),
      emailId: formValues.emailId.trim(),
      uniqueId: autoUniqueId,
      userName: formValues.userName.trim(),
      stateId: selectedState.id,
      cityId: selectedCity.id,
      userPincode: formValues.userPincode.trim()
    });

    // 422 "uniqueId already taken" means user exists — treat as success
    const augmontOk = augmontResponse?.ok ||
      (augmontResponse?.raw?.statusCode === 422) ||
      (augmontResponse?.message || "").toLowerCase().includes("already been taken");

    let augmontAddressResponse = null;

    if (augmontOk) {
      augmontAddressResponse = await createAugmontAddress({
        uniqueId: autoUniqueId,
        request: {
          name: formValues.userName.trim(),
          mobileNumber: formValues.mobileNumber.trim(),
          email: formValues.emailId.trim(),
          address: formValues.address.trim(),
          pincode: formValues.userPincode.trim()
        }
      });
    }

    setSubmitting(false);

    const selectedAddress = augmontAddressResponse?.address || null;

    // Clear any stale data from previous user session
    clearAuthSession();

    setUserProfile({
      fullName: formValues.userName.trim(),
      email: formValues.emailId.trim(),
      mobileNumber: formValues.mobileNumber.trim(),
      pinCode: formValues.userPincode.trim(),
      dateOfBirth: formValues.dateOfBirth,
      uniqueId: autoUniqueId,
      augmontStateId: selectedState.id,
      augmontCityId: selectedCity.id,
      augmontState: formValues.stateName.trim(),
      augmontCity: formValues.cityName.trim(),
      augmontAddress: formValues.address.trim(),
      augmontLandmark: formValues.landmark.trim(),
      augmontUserAddressId: selectedAddress?.userAddressId || ""
    });

    if (augmontResponse?.ok) {
      setAugmontUser({
        uniqueId: autoUniqueId,
        userName: formValues.userName.trim(),
        mobileNumber: formValues.mobileNumber.trim(),
        emailId: formValues.emailId.trim(),
        stateId: selectedState.id,
        cityId: selectedCity.id,
        stateName: formValues.stateName.trim(),
        cityName: formValues.cityName.trim(),
        address: formValues.address.trim(),
        landmark: formValues.landmark.trim(),
        userPincode: formValues.userPincode.trim(),
        userAddressId: selectedAddress?.userAddressId || "",
        addresses: selectedAddress ? [selectedAddress] : [],
        profileExists: true
      });
    }

    const warnings = [];

    if (!augmontOk) {
      warnings.push(
        augmontResponse?.message ||
          "Augmont user creation could not be completed."
      );
    } else if (!augmontAddressResponse?.ok) {
      warnings.push(
        augmontAddressResponse?.message ||
          "Augmont address creation could not be completed."
      );
    }

    if (warnings.length > 0) {
      const warningMessage = warnings.join(" ");
      setSignupWarning(warningMessage);
      toast.error(warningMessage);
    }

    setSuccess(true);
    toast.success("Registration completed successfully");
  };

  const handleSubmit = otpSent ? handleVerifyAndCreate : handleSendOtp;

  return (
    <div className="karatly-shell min-h-screen text-white">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="fixed left-6 top-7 z-10 inline-flex items-center gap-2 text-sm text-white/75 hover:text-white sm:left-20"
      >
        <ArrowLeft className="h-5 w-5 rounded-full border border-white/60 p-0.5" />
        Back
      </button>

      <main className="mx-auto flex min-h-screen w-full max-w-[690px] flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#50360b]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ffd45a] text-black">
            <Crown className="h-10 w-10 fill-black" />
          </div>
        </div>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-black/35 px-4 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/80">
          <ShieldCheck className="h-3 w-3 text-yellow-300" />
          Become a member
        </div>

        <p className="text-[12px] uppercase tracking-[0.48em] text-white/55">Open your golden account</p>
        <h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-5xl">
          Start Your <span className="italic text-[#e5a71e]">Golden</span> Story
        </h1>
        <div className="mx-auto mt-2 h-3 w-12 border-b border-yellow-500/70" />
        <p className="mt-6 max-w-md text-xs leading-5 text-white/75">
          Set up your Karatly profile to invest, store and grow your wealth in certified precious metals
        </p>

        <section className="mt-6 w-full">
              {success ? (
                <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="mt-6 text-3xl font-bold text-white">Registration successful</h2>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-yellow-100/80">
                    Your account has been created successfully. You can continue to your
                    dashboard now.
                  </p>
                  {signupWarning ? (
                    <div className="mt-5 max-w-lg rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                      {signupWarning}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="mt-8 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
                  >
                    Go to dashboard
                  </button>
                </div>
              ) : alreadyRegistered ? (
                <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <h2 className="mt-6 text-3xl font-bold text-white">Already Registered</h2>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-yellow-100/80">
                    {submitError || "This mobile number is already registered. Please login instead."}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="mt-8 rounded-xl bg-yellow-400 px-8 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
                  >
                    Login
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-white">Register</h2>
                    <p className="text-sm leading-6 text-yellow-100/80">
                      {otpSent
                        ? "Verify the OTP to complete your registration."
                        : "Fill in your details to create your account and continue."}
                    </p>
                  </div>

                  {submitError ? (
                    <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-950/40 p-4 text-sm text-rose-100">
                      <p>{submitError}</p>
                    </div>
                  ) : null}

                  <RegistrationForm
                    formValues={formValues}
                    errors={errors}
                    submitting={submitting}
                    otpSent={otpSent}
                    locationOptions={locationOptions}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    onResetOtp={() => {
                      setOtpSent(false);
                      setSubmitError("");
                      setAlreadyRegistered(false);
                      handleChange("otp", "");
                    }}
                  />

                  <p className="mt-6 text-center text-sm text-yellow-200">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-yellow-300">
                      Login
                    </Link>
                  </p>
                </>
              )}
        </section>
      </main>
    </div>
  );
}
