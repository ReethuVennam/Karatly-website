const inputBaseClassName =
  "karatly-input h-10 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60";

const fieldErrorClassName = "mt-1 text-xs text-rose-300";

function FormField({
  label,
  id,
  error,
  required = false,
  children
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="sr-only">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error ? <p className={fieldErrorClassName}>{error}</p> : null}
    </label>
  );
}

export default function RegistrationForm({
  formValues,
  errors,
  submitting,
  otpSent,
  locationOptions,
  onChange,
  onSubmit,
  onResetOtp
}) {
  const stateNames = Object.keys(locationOptions || {});
  const cityNames = Object.keys(locationOptions?.[formValues.stateName]?.cities || {});

  return (
    <form className="mt-7 space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <FormField id="userName" label="Full name" error={errors.userName} required>
          <input
            id="userName"
            type="text"
            value={formValues.userName}
            onChange={(event) => onChange("userName", event.target.value)}
            disabled={otpSent}
            placeholder="Full Name *"
            className={inputBaseClassName}
          />
        </FormField>

        <FormField id="mobileNumber" label="Mobile number" error={errors.mobileNumber} required>
          <input
            id="mobileNumber"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={formValues.mobileNumber}
            onChange={(event) => onChange("mobileNumber", event.target.value)}
            disabled={otpSent}
            placeholder="Mobile Number*"
            className={inputBaseClassName}
          />
        </FormField>

        <FormField id="emailId" label="Email" error={errors.emailId} required>
          <input
            id="emailId"
            type="email"
            value={formValues.emailId}
            onChange={(event) => onChange("emailId", event.target.value)}
            disabled={otpSent}
            placeholder="Email Address *"
            className={inputBaseClassName}
          />
        </FormField>

        <FormField id="stateName" label="State" error={errors.stateName} required>
          <select
            id="stateName"
            value={formValues.stateName}
            onChange={(event) => onChange("stateName", event.target.value)}
            disabled={otpSent}
            className={inputBaseClassName}
          >
              <option value="">State *</option>
            {stateNames.map((stateName) => (
              <option key={stateName} value={stateName}>
                {stateName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="cityName" label="City" error={errors.cityName} required>
          <select
            id="cityName"
            value={formValues.cityName}
            onChange={(event) => onChange("cityName", event.target.value)}
            disabled={otpSent || !formValues.stateName}
            className={inputBaseClassName}
          >
              <option value="">City *</option>
            {cityNames.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="landmark" label="Landmark" error={errors.landmark} required>
          <input
            id="landmark"
            type="text"
            value={formValues.landmark}
            onChange={(event) => onChange("landmark", event.target.value)}
            disabled={otpSent}
            placeholder="Landmark *"
            className={inputBaseClassName}
          />
        </FormField>

        <FormField id="address" label="Address" error={errors.address} required>
          <input
            id="address"
            type="text"
            minLength={11}
            value={formValues.address}
            onChange={(event) => onChange("address", event.target.value)}
            disabled={otpSent}
            placeholder="Address *"
            className={inputBaseClassName}
          />
        </FormField>

        <FormField id="userPincode" label="Pincode" error={errors.userPincode} required>
          <input
            id="userPincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={formValues.userPincode}
            readOnly
            disabled={otpSent}
            placeholder="Pincode*"
            className={inputBaseClassName}
          />
        </FormField>

        <FormField id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth} required>
          <input
            id="dateOfBirth"
            type="date"
            value={formValues.dateOfBirth}
            onChange={(event) => onChange("dateOfBirth", event.target.value)}
            disabled={otpSent}
            className={inputBaseClassName}
          />
        </FormField>

        {otpSent ? (
          <FormField id="otp" label="OTP" error={errors.otp} required>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              value={formValues.otp}
              onChange={(event) => onChange("otp", event.target.value)}
              placeholder="OTP *"
              className={inputBaseClassName}
            />
          </FormField>
        ) : null}
      </div>

      {otpSent ? (
        <button
          type="button"
          onClick={onResetOtp}
          className="text-sm font-semibold text-yellow-300 hover:text-yellow-200"
        >
          Change registration details
        </button>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="karatly-gold-button h-14 w-full rounded-full text-base font-medium transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting
          ? "Please wait..."
          : otpSent
            ? "Verify OTP and complete registration"
            : "Send OTP"}
      </button>
    </form>
  );
}
