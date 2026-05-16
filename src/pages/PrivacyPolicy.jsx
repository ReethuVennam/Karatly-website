import MainLayout from "../layouts/MainLayout";

function PrivacyPolicy() {
  return (
    <MainLayout>

      <div className="max-w-4xl mx-auto px-6 py-16">

        <h1 className="text-4xl font-bold text-yellow-400 mb-6">
          Privacy Policy
        </h1>

        <p className="text-white/70 mb-4">
          SabPe Gold respects your privacy and is committed to protecting your
          personal information.
        </p>

        <p className="text-white/70">
          We collect certain personal information such as name, phone number,
          email address, and KYC details when you use our platform.
        </p>

      </div>

    </MainLayout>
  );
}

export default PrivacyPolicy;