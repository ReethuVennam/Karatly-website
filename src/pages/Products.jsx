/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { getUserProfile, setUserProfile } from "../api/authApi";
import {
  createAugmontAddress,
  createAugmontBuyOrder,
  createAugmontRedeemOrder,
  createAugmontSellOrder,
  fetchAugmontUserProfile,
  createAugmontUser,
  createAugmontUserBank,
  fetchAugmontAddresses,
  fetchAugmontUserBanks,
  fetchAugmontProducts,
  fetchLiveGoldRateSnapshot,
  getAugmontSession,
  getAugmontUser,
  normalizeAugmontUserProfile,
  updateAugmontUser,
  updateAugmontKyc,
  setAugmontUser
} from "../api/augmontApi";
import { prepareAugmontOrderContext } from "../utils/augmontOrderContext";

const initialPagination = {
  hasMore: false,
  count: 0,
  per_page: 10,
  current_page: 1
};

const paymentModes = ["UPI", "NET_BANKING", "CARD"];
const showLegacyTradeActions = false;
const buildGeneratedUniqueId = (mobileNumber = "") =>
  String(mobileNumber || "").replace(/\D/g, "").slice(-10);

const formatPrice = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const getDefaultQuantity = (product) => {
  const weight = Number.parseFloat(product?.productWeight || "0");
  if (!Number.isFinite(weight) || weight <= 0) return "0.1000";
  return weight.toFixed(4);
};

function ErrorBanner({ message, meta, onRetry }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
      <p className="text-red-300">{message}</p>
      {meta && <p className="mt-2 text-xs text-white/60">Provider: {meta}</p>}
      <button
        onClick={onRetry}
        className="mt-4 rounded-xl bg-yellow-500 px-6 py-2 text-black"
      >
        Retry
      </button>
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const PRODUCT_SELECTION_KEY = "selectedGoldProduct";

  const [augmontProducts, setAugmontProducts] = useState([]);
  const [augmontPagination, setAugmontPagination] = useState(initialPagination);
  const [augmontLoading, setAugmontLoading] = useState(true);
  const [augmontLoadingMore, setAugmontLoadingMore] = useState(false);
  const [augmontError, setAugmontError] = useState("");
  const [augmontErrorMeta, setAugmontErrorMeta] = useState("");

  const [selectedAugmontProduct, setSelectedAugmontProduct] = useState(null);
  const [augmontBuyForm, setAugmontBuyForm] = useState({
    quantity: "0.1000",
    modeOfPayment: "UPI"
  });
  const [augmontSellForm, setAugmontSellForm] = useState({
    quantity: "0.0500",
    userBankId: ""
  });
  const [augmontRedeemForm, setAugmontRedeemForm] = useState({
    quantity: "1",
    userAddressId: "",
    modeOfPayment: "wallet"
  });
  const [resolvedAugmontUniqueId, setResolvedAugmontUniqueId] = useState("");
  const [createdAugmontUser, setCreatedAugmontUser] = useState(null);
  const [augmontRedeemOrder, setAugmontRedeemOrder] = useState(null);
  const [_augmontAddresses, setAugmontAddresses] = useState([]);
  const [augmontBanks, setAugmontBanks] = useState([]);
  const [onboardingForm, setOnboardingForm] = useState({
    userName: "",
    mobileNumber: "",
    emailId: "",
    stateName: "",
    cityName: "",
    userPincode: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    address: "",
    kycPayload: ""
  });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buyMessage, setBuyMessage] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState("");
  const productRequestRef = useRef({
    inFlight: false,
    key: ""
  });

  const appProfile = getUserProfile();
  const augmontUser = getAugmontUser();
  const sessionMerchantId =
    getAugmontSession()?.merchantId ||
    import.meta.env.VITE_AUGMONT_MERCHANT_ID?.trim() ||
    "";
  const uniqueId = resolvedAugmontUniqueId || augmontUser?.uniqueId || appProfile?.uniqueId || "";
  const customerMappedId =
    createdAugmontUser?.customerMappedId ||
    augmontUser?.customerMappedId ||
    appProfile?.customerMappedId ||
    "";
  const onboardingProfile = createdAugmontUser || augmontUser || {
    uniqueId: appProfile?.uniqueId || "",
    customerMappedId: appProfile?.customerMappedId || "",
    userStateId: appProfile?.augmontStateId || "",
    userCityId: appProfile?.augmontCityId || "",
    stateName: appProfile?.augmontState || "",
    cityName: appProfile?.augmontCity || "",
    userState: appProfile?.augmontState || "",
    userCity: appProfile?.augmontCity || "",
    kycStatus: appProfile?.augmontKycStatus || "",
    createdAt: appProfile?.augmontCreatedAt || "",
    mobileNumber: appProfile?.mobileNumber || "",
    userEmail: appProfile?.email || "",
    userPincode: appProfile?.pinCode || "",
    userName: appProfile?.fullName || ""
  };
  const onboardingReady = Boolean(
    createdAugmontUser?.profileCompleted ||
      createdAugmontUser?.customerMappedId ||
      augmontUser?.profileCompleted ||
      augmontUser?.customerMappedId ||
      appProfile?.customerMappedId
  );
  const storedAugmontAddressId = String(
    augmontUser?.userAddressId || appProfile?.augmontUserAddressId || ""
  ).trim();

  const loadAugmontProducts = useCallback(async ({ page = 1, append = false } = {}) => {
    const requestKey = `${page}-10-${append ? "append" : "replace"}`;

    if (productRequestRef.current.inFlight) {
      if (productRequestRef.current.key === requestKey) {
        return;
      }

      return;
    }

    productRequestRef.current = {
      inFlight: true,
      key: requestKey
    };

    if (append) {
      setAugmontLoadingMore(true);
    } else {
      setAugmontLoading(true);
      setAugmontError("");
      setAugmontErrorMeta("");
    }

    const response = await fetchAugmontProducts(
      page,
      10,
      sessionMerchantId
    );

    if (!response?.ok) {
      setAugmontError(response?.message || "Failed to fetch Augmont products");
      setAugmontErrorMeta(response?.providerUrl || "");
      if (!append) {
        setAugmontProducts([]);
      }
      setAugmontLoading(false);
      setAugmontLoadingMore(false);
      productRequestRef.current = {
        inFlight: false,
        key: ""
      };
      return;
    }

    setAugmontProducts((current) =>
      append ? [...current, ...response.products] : response.products
    );
    setAugmontPagination(response.pagination);
    setAugmontLoading(false);
    setAugmontLoadingMore(false);
    productRequestRef.current = {
      inFlight: false,
      key: ""
    };
  }, [sessionMerchantId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadAugmontProducts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAugmontProducts]);

  useEffect(() => {
    const loadUserBanks = async () => {
      if (!uniqueId) return;
      const response = await fetchAugmontUserBanks(uniqueId, sessionMerchantId);
      if (!response?.ok || !response.banks?.length) return;

      setAugmontBanks(response.banks);
      setAugmontSellForm((current) => ({
        ...current,
        userBankId:
          current.userBankId ||
          String(
            response.banks[0]?.userBankId ||
            response.banks[0]?.bankId ||
            response.banks[0]?.id ||
            ""
          )
      }));
    };

    loadUserBanks();
  }, [uniqueId, sessionMerchantId]);

  const handleProductClick = (sku) => {
    if (!sku) return;
    navigate(`/products?sku=${encodeURIComponent(sku)}`);
  };

  const handleBuyProduct = async (product) => {
    if (!product) return;

    const nextUniqueId = augmontUser?.uniqueId || appProfile?.uniqueId || "";

    setSelectedAugmontProduct(product);
    setAugmontBuyForm({
      quantity: getDefaultQuantity(product),
      modeOfPayment: "UPI"
    });
    setCreatedAugmontUser(null);
    setAugmontRedeemOrder(null);
    setRedeemError("");
    setAugmontBanks([]);
    setResolvedAugmontUniqueId(nextUniqueId);
    setOnboardingForm({
      userName:
        augmontUser?.userName ||
        appProfile?.fullName ||
        "",
      mobileNumber:
        augmontUser?.mobileNumber ||
        appProfile?.mobileNumber ||
        "",
      emailId:
        augmontUser?.userEmail ||
        appProfile?.email ||
        "",
      stateName:
        augmontUser?.stateName ||
        augmontUser?.userState ||
        appProfile?.augmontState ||
        "",
      cityName:
        augmontUser?.cityName ||
        augmontUser?.userCity ||
        appProfile?.augmontCity ||
        "",
      userPincode:
        augmontUser?.userPincode ||
        appProfile?.pinCode ||
        "",
      accountName:
        augmontUser?.userName ||
        appProfile?.fullName ||
        "",
      accountNumber: "",
      ifscCode: "",
      address: "",
      kycPayload: ""
    });
    setAugmontSellForm({
      quantity: "0.0500",
      userBankId: ""
    });
    setAugmontRedeemForm({
      quantity: "1",
      userAddressId: storedAugmontAddressId,
      modeOfPayment: "wallet"
    });
    setSetupError("");
    setBuyError("");
    setBuyMessage("");
    setSellError("");

    await handleCreateAugmontBuyOrder(product);
  };

  const handleCreateAugmontUser = async () => {
    if (!selectedAugmontProduct) return;
    const trimmedStateName = onboardingForm.stateName.trim();
    const trimmedCityName = onboardingForm.cityName.trim();
    const trimmedAddress = onboardingForm.address.trim();
    const trimmedAccountNumber = onboardingForm.accountNumber.trim();
    const trimmedAccountName = onboardingForm.accountName.trim();
    const trimmedIfscCode = onboardingForm.ifscCode.trim();

    if (!sessionMerchantId) {
      setSetupError("Merchant ID is missing. Configure it before creating the Augmont user.");
      return;
    }

    if (!trimmedStateName || !trimmedCityName) {
      setSetupError("State and city names are required for Augmont onboarding.");
      return;
    }

    if (!onboardingForm.userPincode.trim()) {
      setSetupError("Pincode is required for Augmont onboarding.");
      return;
    }

    if (!trimmedAccountNumber || !trimmedAccountName || !trimmedIfscCode) {
      setSetupError("Bank account number, account name, and IFSC are required.");
      return;
    }

    if (!trimmedAddress) {
      setSetupError("Address is required so the wrapper can create the saved address.");
      return;
    }

    if (!appProfile?.mobileNumber || !appProfile?.email || !appProfile?.fullName || !appProfile?.pinCode) {
      setSetupError("App profile is missing full name, email, mobile number, or pincode. Complete the app profile first.");
      return;
    }

    setSetupLoading(true);
    setSetupError("");
    setCreatedAugmontUser(null);
    setAugmontAddresses([]);

    const nextUniqueId =
      uniqueId ||
      buildGeneratedUniqueId(
        onboardingForm.mobileNumber || appProfile?.mobileNumber || ""
      );
    const userRequest = {
      mobileNumber: onboardingForm.mobileNumber || appProfile?.mobileNumber || "",
      emailId: onboardingForm.emailId || appProfile?.email || "",
      uniqueId: nextUniqueId,
      userName: onboardingForm.userName || appProfile?.fullName || "",
      stateName: trimmedStateName,
      cityName: trimmedCityName,
      userPincode: onboardingForm.userPincode || appProfile?.pinCode || ""
    };
    const createResponse = onboardingReady
      ? await updateAugmontUser({
          merchantId: sessionMerchantId,
          uniqueId: nextUniqueId,
          request: userRequest
        })
      : await createAugmontUser(userRequest, sessionMerchantId);

    if (!createResponse?.ok) {
      setSetupLoading(false);
      setSetupError(
        createResponse?.message ||
          (onboardingReady ? "Unable to update Augmont user" : "Unable to create Augmont user")
      );
      return;
    }

    const profileResponse = await fetchAugmontUserProfile(nextUniqueId);

    if (!profileResponse?.ok) {
      setSetupLoading(false);
      setSetupError(profileResponse?.message || "User created, but profile lookup failed.");
      return;
    }

    const bankResponse = await createAugmontUserBank({
      merchantId: sessionMerchantId,
      uniqueId: nextUniqueId,
      request: {
        accountNumber: trimmedAccountNumber,
        accountName: trimmedAccountName,
        ifscCode: trimmedIfscCode
      }
    });

    if (!bankResponse?.ok) {
      setSetupLoading(false);
      setSetupError(bankResponse?.message || "User created, but bank creation failed.");
      return;
    }

    const addressCreateResponse = await createAugmontAddress({
      merchantId: sessionMerchantId,
      uniqueId: nextUniqueId,
      request: {
        address: trimmedAddress
      }
    });

    if (!addressCreateResponse?.ok) {
      setSetupLoading(false);
      setSetupError(
        addressCreateResponse?.message || "User and bank created, but address creation failed."
      );
      return;
    }

    const addressesResponse = await fetchAugmontAddresses(nextUniqueId, sessionMerchantId);
    const nextAddresses = addressesResponse?.ok ? addressesResponse.addresses || [] : [];
    const banksResponse = await fetchAugmontUserBanks(nextUniqueId, sessionMerchantId);
    const nextBanks = banksResponse?.ok ? banksResponse.banks || [] : [];

    setAugmontAddresses(nextAddresses);

    if (onboardingForm.kycPayload.trim()) {
      let parsedKycPayload = null;

      try {
        parsedKycPayload = JSON.parse(onboardingForm.kycPayload);
      } catch {
        setSetupLoading(false);
        setSetupError("KYC payload must be valid JSON when provided.");
        return;
      }

      const kycUpdateResponse = await updateAugmontKyc({
        merchantId: sessionMerchantId,
        uniqueId: nextUniqueId,
        request: parsedKycPayload
      });

      if (!kycUpdateResponse?.ok) {
        setSetupLoading(false);
        setSetupError(kycUpdateResponse?.message || "KYC update failed.");
        return;
      }
    }


    setSetupLoading(false);
    const profile = normalizeAugmontUserProfile(profileResponse.profile, nextUniqueId);
    const persistedProfile = {
      userName:
        profile.userName ||
        onboardingForm.userName ||
        appProfile?.fullName ||
        "",
      uniqueId: String(profile.uniqueId || nextUniqueId),
      customerMappedId: String(profile.customerMappedId || ""),
      mobileNumber:
        profile.mobileNumber ||
        onboardingForm.mobileNumber ||
        appProfile?.mobileNumber ||
        "",
      userEmail:
        profile.userEmail ||
        onboardingForm.emailId ||
        appProfile?.email ||
        "",
      emailId:
        profile.userEmail ||
        onboardingForm.emailId ||
        appProfile?.email ||
        "",
      userStateId: String(profile.userStateId || ""),
      userCityId: String(profile.userCityId || ""),
      userPincode:
        profile.userPincode ||
        onboardingForm.userPincode ||
        appProfile?.pinCode ||
        "",
      kycStatus:
        profile.kycStatus ||
        "",
      stateName:
        profile.stateName ||
        profile.userState ||
        trimmedStateName,
      cityName:
        profile.cityName ||
        profile.userCity ||
        trimmedCityName,
      userState:
        profile.userState || profile.stateName || trimmedStateName,
      userCity:
        profile.userCity || profile.cityName || trimmedCityName,
      createdAt: profile.createdAt || "",
      userBankId: profile.userBankId || "",
      userAddressId: profile.userAddressId || "",
      profileCompleted: true
    };

    setCreatedAugmontUser(persistedProfile);
    setAugmontBanks(nextBanks);
    setResolvedAugmontUniqueId(persistedProfile.uniqueId);
    setAugmontSellForm((current) => ({
      ...current,
      userBankId:
        current.userBankId ||
        String(nextBanks[0]?.userBankId || nextBanks[0]?.bankId || nextBanks[0]?.id || "")
    }));
    setAugmontUser(persistedProfile);
    setUserProfile({
      fullName: appProfile?.fullName || persistedProfile.userName || "",
      email: appProfile?.email || persistedProfile.userEmail || "",
      mobileNumber: appProfile?.mobileNumber || persistedProfile.mobileNumber || "",
      pinCode: appProfile?.pinCode || persistedProfile.userPincode || "",
      uniqueId: persistedProfile.uniqueId,
      customerMappedId: persistedProfile.customerMappedId,
      augmontStateId: persistedProfile.userStateId,
      augmontCityId: persistedProfile.userCityId,
      augmontState: persistedProfile.stateName || persistedProfile.userState,
      augmontCity: persistedProfile.cityName || persistedProfile.userCity,
      augmontKycStatus: persistedProfile.kycStatus,
      augmontCreatedAt: persistedProfile.createdAt
    });
  };

  const handleCreateAugmontBuyOrder = async (productParam) => {
    const activeProduct = productParam || selectedAugmontProduct;
    if (!activeProduct) return;

    if (!augmontBuyForm.quantity) {
      setBuyError("Quantity is required.");
      return;
    }

    setBuyLoading(true);
    setBuyError("");
    setBuyMessage("");

    try {
      const orderContext = await prepareAugmontOrderContext("buy");
      const liveRate = Number(orderContext.rate || 0);
      const liveBlockId = orderContext.blockId;
      const quantity = String(augmontBuyForm.quantity || getDefaultQuantity(activeProduct)).trim();
      const merchantTransactionId = `KTL-BUY-${Date.now()}`;

      if (liveRate <= 0) {
        throw new Error("Live buy rate unavailable. Please refresh and try again.");
      }

      const response = await createAugmontBuyOrder({
        merchantId: sessionMerchantId,
        request: {
          merchantTransactionId,
          uniqueId: orderContext.uniqueId,
          lockPrice: liveRate.toFixed(2),
          metalType: String(activeProduct?.metalType || "gold").toLowerCase(),
          quantity,
          modeOfPayment: augmontBuyForm.modeOfPayment || "UPI",
          blockId: liveBlockId
        }
      });

      if (!response?.ok) {
        setBuyError(response?.message || "Unable to place Augmont buy order");
        return;
      }

      setBuyMessage(response?.message || "Buy order placed successfully.");
    } catch (error) {
      setBuyError(error?.message || "Unable to place Augmont buy order");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleCreateAugmontSellOrder = async () => {
    if (!selectedAugmontProduct) return;

    if (!uniqueId) {
      setSellError("Complete Augmont user onboarding before placing the sell order.");
      return;
    }

    if (!augmontSellForm.quantity) {
      setSellError("Quantity is required.");
      return;
    }

    const selectedBank = augmontBanks.find((bank) =>
      String(bank?.userBankId || bank?.bankId || bank?.id || "") ===
      String(augmontSellForm.userBankId || "")
    );
    const sellBank = {
      accountName: String(selectedBank?.accountName || "").trim(),
      accountNumber: String(selectedBank?.accountNumber || "").replace(/\s/g, ""),
      ifscCode: String(selectedBank?.ifscCode || "").trim().toUpperCase()
    };

    if (!augmontSellForm.userBankId || !sellBank.accountName || !sellBank.accountNumber || !sellBank.ifscCode) {
      setSellError("Select a saved bank account before placing the sell order.");
      return;
    }

    setSellLoading(true);
    setSellError("");

    try {
      // Fetch live rates
      const ratesResponse = await fetchLiveGoldRateSnapshot({ allowNetwork: false });
      if (!ratesResponse?.ok || !ratesResponse?.snapshot?.sellPrice) {
        throw new Error("Unable to fetch live sell rate");
      }

      const liveSellRate = Number(ratesResponse.snapshot.sellPrice || 0);
      const liveBlockId = String(ratesResponse.snapshot.blockId || ratesResponse.blockId || "").trim();
      const liveLockPrice = liveSellRate.toFixed(2);
      const merchantTransactionId = `KTL-SELL-${Date.now()}`;

      // Call only the sell order creation API
      const response = await createAugmontSellOrder({
        merchantId: sessionMerchantId,
        request: {
          uniqueId,
          lockPrice: liveLockPrice,
          metalType: String(selectedAugmontProduct?.metalType || "gold").toLowerCase(),
          quantity: augmontSellForm.quantity,
          merchantTransactionId,
          blockId: liveBlockId,
          accountName: sellBank.accountName,
          accountNumber: sellBank.accountNumber,
          ifscCode: sellBank.ifscCode
        }
      });

      if (!response?.ok) {
        setSellError(response?.message || "Unable to place Augmont sell order");
        return;
      }
    } catch (error) {
      setSellError(error?.message || "Unable to place Augmont sell order");
      return;
    } finally {
      setSellLoading(false);
    }

  };

  async function handleCreateAugmontRedeemOrder(productOverride = null, addressIdOverride = "") {
    const activeProduct = productOverride || selectedAugmontProduct;
    if (!activeProduct) return;

    if (!uniqueId) {
      setRedeemError("Complete Augmont user onboarding before placing the redeem order.");
      return;
    }

    if (!augmontRedeemForm.quantity) {
      setRedeemError("Quantity is required.");
      return;
    }

    const resolvedAddressId = String(
      addressIdOverride ||
        augmontRedeemForm.userAddressId ||
        augmontUser?.userAddressId ||
        appProfile?.augmontUserAddressId ||
        ""
    ).trim();

    if (!resolvedAddressId) {
      setRedeemError("Select a saved address before placing the redeem order.");
      return;
    }

    const mobileNumber = String(
      onboardingProfile?.mobileNumber || appProfile?.mobileNumber || ""
    ).trim();

    if (!mobileNumber) {
      setRedeemError("Mobile number is required before placing the redeem order.");
      return;
    }

    const redeemSku = String(
      activeProduct?.sku || activeProduct?.id || ""
    ).trim();

    if (!redeemSku) {
      setRedeemError("Selected Augmont product SKU is missing.");
      return;
    }

    setRedeemLoading(true);
    setRedeemError("");
    setAugmontRedeemOrder(null);

    const response = await createAugmontRedeemOrder({
      merchantId: sessionMerchantId,
      request: {
        uniqueId,
        mobileNumber,
        addressId: resolvedAddressId,
        products: [
          {
            sku: redeemSku,
            quantity: augmontRedeemForm.quantity
          }
        ],
        modeOfPayment: augmontRedeemForm.modeOfPayment
      }
    });

    setRedeemLoading(false);

    if (!response?.ok) {
      setRedeemError(response?.message || "Unable to place Augmont redeem order");
      return;
    }

    setAugmontRedeemOrder(response.order || {});
  }




  const unifiedProducts = augmontProducts.map((product) => ({
    id: product?.sku || product?.id,
    product
  }));

  const initialLoading = augmontLoading;
  const isEmpty =
    !initialLoading &&
    unifiedProducts.length === 0 &&
    !augmontError;

  const redeemSummary = (() => {
    const source = augmontRedeemOrder || {};
    const result = source?.result?.data || source?.payload?.result?.data || source?.data || source;
    return {
      message:
        source?.message ||
        source?.payload?.message ||
        source?.statusMessage ||
        result?.message ||
        'Redeem order created successfully.',
      shippingCharges: result?.shippingCharges || source?.shippingCharges || '',
      goldBalance: result?.goldBalance || source?.goldBalance || '',
      silverBalance: result?.silverBalance || source?.silverBalance || '',
      hasSummary: Boolean(result?.shippingCharges || result?.goldBalance || result?.silverBalance)
    };
  })();

  return (
    <div className="bg-black text-white">
      <Navbar />

      <main className="pt-20">
        <section className="px-6 py-28 lg:px-20">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-4 text-center text-4xl font-bold">
              Gold Products
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-center text-white/60">
              Explore our live gold product catalog in one unified product feed.
            </p>

            {augmontLoading && unifiedProducts.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#111] p-8 text-center text-gray-400">
                Loading products...
              </div>
            )}

            {!initialLoading && augmontError && (
              <div className="mb-6">
                <ErrorBanner
                  message={augmontError}
                  meta={augmontErrorMeta}
                  onRetry={() => loadAugmontProducts({ page: 1, append: false })}
                />
              </div>
            )}

            {!initialLoading && unifiedProducts.length > 0 && (
              <>
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111] p-4 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                  <p>Showing {unifiedProducts.length} products</p>
                  <p>Augmont: {augmontProducts.length}</p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {unifiedProducts.map((item) => (
                    <ProductCard
                      key={`augmont-${item.id}`}
                      product={item.product}
                      onClick={handleProductClick}
                      onBuy={handleBuyProduct}
                    />
                  ))}
                </div>

                {augmontPagination?.hasMore && (
                  <div className="mt-10 flex justify-center">
                    <button
                      onClick={() =>
                        loadAugmontProducts({
                          page: (augmontPagination?.current_page || 1) + 1,
                          append: true
                        })
                      }
                      disabled={augmontLoadingMore}
                      className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {augmontLoadingMore ? "Loading more..." : "Load More Products"}
                    </button>
                  </div>
                )}
              </>
            )}

            {isEmpty && (
              <div className="rounded-2xl border border-white/10 bg-[#111] p-8 text-center text-gray-400">
                No products found.
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedAugmontProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/10 bg-[#0f0f0f] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-yellow-300">
                  Augmont Product Redeem
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {selectedAugmontProduct.name}
                </h3>
                <p className="mt-2 text-sm text-white/55">
                  The Buy button now places an Augmont buy order and shows the response below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAugmontProduct(null);
                  setCreatedAugmontUser(null);
                  setAugmontRedeemOrder(null);
                  setSetupError("");
                  setBuyError("");
                  setRedeemError("");
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-red-500/30 hover:text-red-200"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-white">Redeem Response</p>
              <p className="mt-2 text-xs text-white/50">
                Only the final message is shown for this product action.
              </p>

              {buyLoading ? (
                <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-sm text-yellow-100">
                  Placing Augmont buy order...
                </div>
              ) : buyError ? (
                <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                  {buyError}
                </div>
              ) : buyMessage ? (
                <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
                  {buyMessage}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/45">
                  Click the Buy button to place an Augmont buy order.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
