const BASE_URL =
  import.meta.env.VITE_AUGMONT_BASE_URL?.trim() ||
  "https://uatbckend.karatly.net";
const DEFAULT_MERCHANT_ID =
  import.meta.env.VITE_AUGMONT_MERCHANT_ID?.trim() || "11692";
const AUGMONT_SESSION_KEY = "augmontSession";
const LIVE_GOLD_RATE_HISTORY_KEY = "liveGoldRateHistory";
const LIVE_GOLD_RATE_HISTORY_LIMIT = 12;
const AUGMONT_USER_KEY = "augmontUser";
const AUGMONT_ORDER_REFERENCES_KEY = "augmontOrderReferences";
const RATE_CACHE_TTL_MS = 30 * 1000;
const RATE_CACHE_PREFIX = "augmontRateCache:";

const rateCacheMemory = new Map();
const rateRequestsInFlight = new Map();

const getRateCacheKey = (name, params = {}) =>
  `${RATE_CACHE_PREFIX}${name}:${JSON.stringify(params)}`;

const readRateCache = (name, params = {}) => {
  const key = getRateCacheKey(name, params);
  const memoryEntry = rateCacheMemory.get(key);
  if (memoryEntry) return memoryEntry;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    rateCacheMemory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
};

const writeRateCache = (name, params, value) => {
  const key = getRateCacheKey(name, params);
  const entry = {
    storedAt: Date.now(),
    value
  };
  rateCacheMemory.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage can fail in private mode; memory cache still works.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("augmontRatesUpdated", {
        detail: { name, params, storedAt: entry.storedAt }
      })
    );
  }
  return value;
};

const getValidCachedRate = (name, params = {}) => {
  const entry = readRateCache(name, params);
  if (!entry) return null;
  return Date.now() - Number(entry.storedAt || 0) < RATE_CACHE_TTL_MS
    ? entry.value
    : null;
};

const getAnyCachedRate = (name, params = {}) =>
  readRateCache(name, params)?.value || null;

const withRateCache = async (
  name,
  params,
  loader,
  { force = false, allowNetwork = true } = {}
) => {
  if (!force) {
    const cached = getValidCachedRate(name, params);
    if (cached) return { ...cached, fromCache: true };
  }

  const key = getRateCacheKey(name, params);
  if (!force && rateRequestsInFlight.has(key)) {
    const response = await rateRequestsInFlight.get(key);
    return { ...response, fromCache: true };
  }

  if (!allowNetwork) {
    const cached = getAnyCachedRate(name, params);
    return cached
      ? { ...cached, fromCache: true, stale: !getValidCachedRate(name, params) }
      : {
          ok: false,
          fromCache: true,
          message: "Cached rate data is unavailable"
        };
  }

  const request = loader()
    .then((response) => writeRateCache(name, params, response))
    .finally(() => rateRequestsInFlight.delete(key));

  rateRequestsInFlight.set(key, request);
  return request;
};

const getJson = async (res) => {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      status: "error",
      payload: {
        statusCode: res.status,
        message: text || "Invalid server response"
      }
    };
  }
};

const extractBackendMessage = (data, fallback = "Request failed") => {
  const payloadMessage = data?.payload?.message;
  const responseBody = data?.payload?.responseBody;

  if (typeof responseBody === "string") {
    try {
      const parsed = JSON.parse(responseBody);
      return parsed?.message || payloadMessage || fallback;
    } catch {
      return responseBody || payloadMessage || fallback;
    }
  }

  return payloadMessage || data?.message || fallback;
};

const extractStatusCode = (data) =>
  data?.payload?.statusCode ||
  data?.statusCode ||
  data?.code ||
  data?.payload?.code ||
  "";

const getStoredAugmontUser = () => {
  try {
    const raw = localStorage.getItem(AUGMONT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getStoredOrderReferences = () => {
  try {
    const raw = localStorage.getItem(AUGMONT_ORDER_REFERENCES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const storeOrderReference = (reference) => {
  if (!reference?.merchantTransactionId && !reference?.transactionId) {
    return;
  }

  const nextReference = {
    ...reference,
    storedAt: new Date().toISOString()
  };
  const existing = getStoredOrderReferences().filter(
    (item) =>
      item?.merchantTransactionId !== nextReference.merchantTransactionId &&
      item?.transactionId !== nextReference.transactionId
  );

  localStorage.setItem(
    AUGMONT_ORDER_REFERENCES_KEY,
    JSON.stringify([nextReference, ...existing].slice(0, 50))
  );
};

const setStoredAugmontUser = (user) => {
  const existing = getStoredAugmontUser() || {};
  localStorage.setItem(
    AUGMONT_USER_KEY,
    JSON.stringify({
      ...existing,
      ...user
    })
  );
};

export const normalizeAugmontUserProfile = (data, fallbackUniqueId = "") => {
  const result =
    data?.payload?.result?.data ||
    data?.payload?.result ||
    data?.payload?.data ||
    data?.data ||
    data ||
    {};

  return {
    userName: result?.userName || result?.name || "",
    uniqueId:
      result?.uniqueId ||
      result?.userUniqueId ||
      result?.customerUniqueId ||
      fallbackUniqueId,
    customerMappedId: result?.customerMappedId || "",
    mobileNumber: result?.mobileNumber || result?.mobileNo || "",
    userEmail: result?.userEmail || result?.emailId || result?.email || "",
    emailId: result?.userEmail || result?.emailId || result?.email || "",
    userStateId: result?.userStateId || result?.stateId || "",
    userCityId: result?.userCityId || result?.cityId || "",
    stateName: result?.stateName || result?.userState || "",
    cityName: result?.cityName || result?.userCity || "",
    userPincode:
      result?.userPincode || result?.pincode || result?.pinCode || "",
    kycStatus: result?.kycStatus || "",
    userState: result?.userState || "",
    userCity: result?.userCity || "",
    createdAt: result?.createdAt || "",
    userBankId: result?.userBankId || "",
    userAddressId: result?.userAddressId || "",
    profileExists: Boolean(
      Object.keys(result || {}).length ||
      fallbackUniqueId
    ),
    profileCompleted: Boolean(
      (result?.uniqueId ||
        result?.userUniqueId ||
        result?.customerUniqueId ||
        fallbackUniqueId) &&
        (result?.userName || result?.name) &&
        (result?.mobileNumber || result?.mobileNo) &&
        (result?.emailId || result?.email || result?.userEmail)
    ),
    raw: result
  };
};

const selectProductImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return "";

  const defaultImage = images.find(
    (image) => image?.defaultImage && image?.url
  );
  if (defaultImage) return defaultImage.url;

  const orderedImage = [...images]
    .filter((image) => image?.url)
    .sort(
      (a, b) =>
        (a?.displayOrder ?? Number.MAX_SAFE_INTEGER) -
        (b?.displayOrder ?? Number.MAX_SAFE_INTEGER)
    )[0];

  return orderedImage?.url || "";
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickFirstPositiveNumber = (...values) => {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
};

const normalizeProduct = (product) => ({
  id: product?.sku || `product-${Math.random().toString(36).slice(2, 9)}`,
  sku: product?.sku || "",
  name: product?.name || "Untitled Product",
  description:
    product?.description && product.description !== "NA"
      ? product.description
      : "",
  basePrice: product?.basePrice || "0",
  metalType: product?.metalType || "NA",
  purity: product?.purity || "NA",
  productWeight: product?.productWeight || "NA",
  redeemWeight: product?.redeemWeight || "NA",
  jewelleryType: product?.jewelleryType || "NA",
  productSize: product?.productSize || "NA",
  status: product?.status || "inactive",
  productImages: Array.isArray(product?.productImages)
    ? product.productImages
    : [],
  imageUrl: selectProductImage(product?.productImages)
});

const normalizePagination = (pagination = {}) => ({
  hasMore: Boolean(pagination?.hasMore),
  count: Number(pagination?.count || 0),
  per_page: Number(pagination?.per_page || 0),
  current_page: Number(pagination?.current_page || 1)
});

const findRateValue = (container = {}, keys = []) =>
  pickFirstPositiveNumber(...keys.map((key) => container?.[key]));

const extractOrderResult = (data) =>
  data?.result?.data ||
  data?.result ||
  data?.payload?.result?.data ||
  data?.payload?.result ||
  data?.payload?.data ||
  data?.data ||
  data ||
  {};

const extractOrderArray = (data) => {
  const result = extractOrderResult(data);

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.orders)) return result.orders;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(data?.payload?.result?.data?.orders)) {
    return data.payload.result.data.orders;
  }

  return result && typeof result === "object" ? [result] : [];
};

const normalizeOrderStatus = (status) => {
  if (!status) return "Pending";
  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// ── REPLACE normalizeAugmontOrder in augmontApi.js with this ──────────────────
// Find: "const normalizeAugmontOrder = (source, order, index = 0) => {"
// Replace the entire function with the block below:

const normalizeAugmontOrder = (source, order, index = 0) => {
  // Augmont buy list returns: qty, exclTaxAmt, inclTaxAmt, exclTaxRate, taxRate, taxAmt
  // Augmont sell list returns: qty, totalAmount, rate, taxRate, taxAmt
  const amount = pickFirstPositiveNumber(
    order?.inclTaxAmt,
    order?.exclTaxAmt,
    order?.totalAmount,
    order?.amount,
    order?.buyPrice,
    order?.sellPrice,
    order?.payableAmount,
    order?.receivableAmount
  );
  const grams = pickFirstPositiveNumber(
    order?.qty,           // ← Augmont buy/sell list field
    order?.metalQuantity,
    order?.quantity,
    order?.goldAmount,
    order?.grams
  );
  const rate = pickFirstPositiveNumber(
    order?.exclTaxRate,   // ← buy list: rate excl tax
    order?.rate,          // ← sell list: rate
    order?.inclTaxRate
  );
  const transactionId =
    order?.transactionId ||
    order?.txnId ||
    order?.transactionID ||
    order?.id ||
    "";
  const merchantTransactionId =
    order?.merchantTransactionId ||
    order?.merchantTxnId ||
    order?.merchantOrderId ||
    "";
  const uniqueId =
    order?.uniqueId || order?.userUniqueId || order?.customerUniqueId || "";

  // No status in list response = Completed (unless cancelled)
  const rawStatus = order?.status || order?.orderStatus || order?.transactionStatus;
  const status = rawStatus
    ? normalizeOrderStatus(rawStatus)
    : order?.cancelId
      ? "Cancelled"
      : "Completed";

  const createdAt =
    order?.createdAt ||
    order?.transactionDate ||
    order?.orderDate ||
    order?.date ||
    order?.updatedAt ||
    "";

  return {
    id: merchantTransactionId || transactionId || `${source}-order-${index}`,
    type: source.toUpperCase(),
    amount,
    gold: grams,
    rate,
    taxRate: order?.taxRate ?? null,   // TC21 — tax rate %
    taxAmt: order?.taxAmt ?? null,     // TC20 — tax amount
    date: createdAt,
    status,
    merchantTransactionId,
    transactionId,
    uniqueId,
    raw: order
  };
};
export const normalizeGoldRatePayload = (data) => {
  const rates =
    data?.payload?.result?.data?.rates ||
    data?.payload?.result?.rates ||
    data?.payload?.rates ||
    data?.rates ||
    {};

  const buyPrice = findRateValue(rates, [
    "gBuy",
    "buy",
    "buyPrice",
    "goldBuy",
    "gold_buy"
  ]);
  const sellPrice = findRateValue(rates, [
    "gSell",
    "sell",
    "sellPrice",
    "goldSell",
    "gold_sell"
  ]);
  const currentPrice = pickFirstPositiveNumber(
    rates?.current,
    rates?.price,
    rates?.goldPrice,
    buyPrice,
    sellPrice
  );

  return {
    currentPrice,
    buyPrice: buyPrice || currentPrice,
    sellPrice: sellPrice || currentPrice,
    blockId:
      data?.payload?.result?.data?.blockId ||
      data?.payload?.result?.blockId ||
      data?.blockId ||
      "",
    metalType: rates?.metalType || "gold",
    updatedAt:
      rates?.updatedAt ||
      rates?.timestamp ||
      data?.payload?.result?.data?.updatedAt ||
      new Date().toISOString(),
    gold: {
      currentPrice,
      buyPrice: buyPrice || currentPrice,
      sellPrice: sellPrice || currentPrice
    },
    silver: {
      currentPrice: findRateValue(rates, [
        "sCurrent",
        "silverCurrent",
        "silverPrice",
        "sPrice"
      ]),
      buyPrice: findRateValue(rates, [
        "sBuy",
        "silverBuy",
        "silver_buy",
        "silverBuyPrice"
      ]),
      sellPrice: findRateValue(rates, [
        "sSell",
        "silverSell",
        "silver_sell",
        "silverSellPrice"
      ])
    },
    rawRates: rates
  };
};

export const normalizeSipRatePayload = (data) => {
  const rates =
    data?.payload?.result?.data?.rates ||
    data?.payload?.result?.rates ||
    data?.payload?.rates ||
    data?.rates ||
    data?.payload?.result?.data ||
    {};

  return {
    gold: {
      currentPrice: findRateValue(rates, [
        "gBuy",
        "goldSipRate",
        "goldRate",
        "buy",
        "buyPrice"
      ]),
      buyPrice: findRateValue(rates, [
        "gBuy",
        "goldSipRate",
        "goldRate",
        "buy",
        "buyPrice"
      ])
    },
    silver: {
      currentPrice: findRateValue(rates, [
        "sBuy",
        "silverSipRate",
        "silverRate",
        "silverBuy"
      ]),
      buyPrice: findRateValue(rates, [
        "sBuy",
        "silverSipRate",
        "silverRate",
        "silverBuy"
      ])
    },
    updatedAt:
      rates?.updatedAt ||
      data?.payload?.result?.data?.updatedAt ||
      new Date().toISOString(),
    rawRates: rates
  };
};

export const normalizeRateHistoryPayload = (data, metalType = "gold") => {
  const source = Array.isArray(data?.payload?.result?.data)
    ? data.payload.result.data
    : [];

  return source
    .map((item) => {
      const buyRate = toNumber(item?.buyRate);
      const sellRate = toNumber(item?.sellRate);

      return {
        date: item?.date || "",
        metalType: item?.type || metalType,
        buyRate,
        sellRate,
        label: item?.date || "",
        price: buyRate || sellRate || 0,
        updatedAt: item?.date || "",
        returns: {
          oneDay: item?.oneDayReturn ?? null,
          oneWeek: item?.oneWeekReturn ?? null,
          oneMonth: item?.oneMonthReturn ?? null,
          threeMonth: item?.threeMonthReturn ?? null,
          sixMonth: item?.sixMonthReturn ?? null,
          nineMonth: item?.nineMonthReturn ?? null,
          oneYear: item?.oneYearReturn ?? null,
          twoYear: item?.twoYearReturn ?? null,
          threeYear: item?.threeYearReturn ?? null,
          fourYear: item?.fourYearReturn ?? null,
          fiveYear: item?.fiveYearReturn ?? null
        },
        raw: item
      };
    })
    .filter((item) => item.buyRate > 0 || item.sellRate > 0);
};

const readGoldRateHistory = () => {
  try {
    const raw = localStorage.getItem(LIVE_GOLD_RATE_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter(
          (point) => point && point.label && Number.isFinite(Number(point.price))
        )
      : [];
  } catch {
    return [];
  }
};

const storeGoldRatePoint = (snapshot) => {
  const history = readGoldRateHistory();
  const timestamp = new Date(snapshot.updatedAt || Date.now());
  const nextPoint = {
    label: timestamp.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    }),
    price: Number(snapshot.currentPrice.toFixed(2)),
    updatedAt: snapshot.updatedAt || timestamp.toISOString()
  };

  const dedupedHistory = history.filter(
    (point) => point.updatedAt !== nextPoint.updatedAt
  );
  const nextHistory = [...dedupedHistory, nextPoint].slice(
    -LIVE_GOLD_RATE_HISTORY_LIMIT
  );

  localStorage.setItem(
    LIVE_GOLD_RATE_HISTORY_KEY,
    JSON.stringify(nextHistory)
  );

  return nextHistory;
};

export const getAugmontSession = () => {
  try {
    const raw = sessionStorage.getItem(AUGMONT_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.merchantId ? parsed : { merchantId: DEFAULT_MERCHANT_ID };
  } catch {
    return { merchantId: DEFAULT_MERCHANT_ID };
  }
};

const setAugmontSession = (session) => {
  sessionStorage.setItem(
    AUGMONT_SESSION_KEY,
    JSON.stringify({
      merchantId: session?.merchantId || DEFAULT_MERCHANT_ID
    })
  );
};

export const clearAugmontSession = () => {
  sessionStorage.removeItem(AUGMONT_SESSION_KEY);
};

export const getAugmontUser = () => getStoredAugmontUser();
export const setAugmontUser = (user) => setStoredAugmontUser(user);

export const loginUser = async () => ({
  ok: true,
  merchantId: DEFAULT_MERCHANT_ID,
  message:
    "Provider authentication is handled internally by the goldplatform wrapper."
});

export const loginAugmont = async ({ force = false } = {}) => {
  const session = { merchantId: DEFAULT_MERCHANT_ID };
  if (force) {
    clearAugmontSession();
  }
  setAugmontSession(session);
  return {
    ok: true,
    ...session,
    message:
      "Provider authentication is handled internally by the goldplatform wrapper."
  };
};

export const createUser = async (userData) =>
  createAugmontUser(
    {
      mobileNumber: userData?.mobileNumber || "",
      emailId: userData?.email || userData?.emailId || "",
      uniqueId: userData?.uniqueId || `USER-${Date.now()}`,
      userName: userData?.name || userData?.userName || "",
      stateName: userData?.stateName || "",
      cityName: userData?.cityName || "",
      userPincode: userData?.userPincode || ""
    },
    userData?.merchantId
  );

const requestAugmontUserEndpoint = async (path, body) =>
  requestAugmontOrderEndpoint(path, body, "Failed to fetch backend data");

const requestAugmontOrderEndpoint = async (
  path,
  body = {},
  fallbackMessage = "Failed to complete order request"
) => {
  try {
    const resolvedMerchantId =
      body?.merchantId || getAugmontSession()?.merchantId || DEFAULT_MERCHANT_ID;
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchantId: resolvedMerchantId,
        ...body
      })
    });

    const data = await getJson(res);
    const statusCode = String(extractStatusCode(data) || "");
    const isMinimalSuccess =
      res.ok &&
      (data?.status === "success" ||
        !data?.status ||
        statusCode.startsWith("2") ||
        /success/i.test(data?.message || data?.payload?.message || ""));

    if (!isMinimalSuccess) {
      return {
        ok: false,
        message: extractBackendMessage(data, fallbackMessage),
        raw: data
      };
    }

    return {
      ok: true,
      statusCode,
      data,
      raw: data
    };
  } catch (error) {
    console.error("AUGMONT ORDER API ERROR:", error);
    return {
      ok: false,
      message: fallbackMessage
    };
  }
};

const requestAugmontWrapperEndpoint = async (
  path,
  body = {},
  fallbackMessage = "Request failed"
) => requestAugmontOrderEndpoint(path, body, fallbackMessage);

export const fetchAugmontUserProfile = async (uniqueId) => {
  if (!uniqueId) {
    return {
      ok: false,
      message: "Missing Augmont uniqueId"
    };
  }

  const response = await requestAugmontUserEndpoint("/api/v1/users/profile", {
    uniqueId
  });

  if (!response.ok) {
    return response;
  }

  const result =
    response.data?.payload?.result?.data ||
    response.data?.payload?.result ||
    response.data?.data ||
    {};
  const normalized = normalizeAugmontUserProfile(result, uniqueId);
  setStoredAugmontUser(normalized);

  return {
    ok: true,
    profile: normalized,
    raw: response.raw
  };
};

export const createAugmontUser = async (request, merchantId) => {
  if (
    !request?.mobileNumber ||
    !request?.emailId ||
    !request?.uniqueId ||
    !request?.userName ||
    !request?.stateName ||
    !request?.cityName ||
    !request?.userPincode
  ) {
    return {
      ok: false,
      message: "Missing required Augmont user fields"
    };
  }

  const response = await requestAugmontUserEndpoint("/api/v1/users/create", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    request: {
      mobileNumber: String(request?.mobileNumber || "").trim(),
      emailId: String(request?.emailId || "").trim(),
      uniqueId: String(request?.uniqueId || "").trim(),
      userName: String(request?.userName || "").trim(),
      stateName: String(request?.stateName || "").trim(),
      cityName: String(request?.cityName || "").trim(),
      userPincode: String(request?.userPincode || "").trim()
    }
  });

  if (!response.ok) {
    return response;
  }

  return {
    ok: true,
    statusCode: response.statusCode,
    message:
      response.raw?.payload?.message ||
      response.raw?.message ||
      "Augmont user create request accepted",
    raw: response.raw
  };
};

export const updateAugmontUser = async ({ uniqueId, request, merchantId }) =>
  requestAugmontUserEndpoint("/api/v1/users/update", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim(),
    request: {
      mobileNumber: String(request?.mobileNumber || "").trim(),
      emailId: String(request?.emailId || "").trim(),
      userName: String(request?.userName || "").trim(),
      stateName: String(request?.stateName || "").trim(),
      cityName: String(request?.cityName || "").trim(),
      userPincode: String(request?.userPincode || "").trim()
    }
  });

export const fetchAugmontKycProfile = async (uniqueId, merchantId) => {
  if (!uniqueId) {
    return {
      ok: false,
      message: "Missing Augmont uniqueId"
    };
  }

  const response = await requestAugmontUserEndpoint("/api/v1/users/kyc/profile", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim()
  });

  if (!response.ok) {
    return response;
  }

  const result =
    response.data?.payload?.result?.data ||
    response.data?.payload?.result ||
    response.data?.data ||
    {};

  return {
    ok: true,
    kycProfile: result,
    raw: response.raw
  };
};

export const updateAugmontKyc = async ({ uniqueId, request, merchantId }) =>
  requestAugmontUserEndpoint("/api/v1/users/kyc/update", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim(),
    request: request || {}
  });

export const createAugmontUserBank = async ({ uniqueId, request, merchantId }) =>
  requestAugmontUserEndpoint("/api/v1/users/banks/create", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim(),
    request: {
      accountNumber: String(request?.accountNumber || "").trim(),
      accountName: String(request?.accountName || "").trim(),
      ifscCode: String(request?.ifscCode || "").trim()
    }
  });

export const updateAugmontUserBank = async ({
  uniqueId,
  userBankId,
  request,
  merchantId
}) =>
  requestAugmontUserEndpoint("/api/v1/users/banks/update", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim(),
    userBankId: String(userBankId || "").trim(),
    request: {
      accountNumber: String(request?.accountNumber || "").trim(),
      accountName: String(request?.accountName || "").trim(),
      ifscCode: String(request?.ifscCode || "").trim(),
      status: String(request?.status || "active").trim()
    }
  });

export const fetchAugmontUserBanks = async (uniqueId, merchantId) => {
  if (!uniqueId) {
    return { ok: false, message: "Missing Augmont uniqueId", banks: [] };
  }

  // Use our local DB endpoint — Augmont UAT masks accountNumber/ifscCode in list API
  try {
    const res = await fetch(`${BASE_URL}/api/v1/users/banks/list-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uniqueId: String(uniqueId).trim() })
    });
    const data = await res.json();
    if (data?.ok && Array.isArray(data?.banks) && data.banks.length > 0) {
      return { ok: true, banks: data.banks };
    }
  } catch (e) {
    console.warn("[fetchAugmontUserBanks] local endpoint failed, falling back to Augmont", e);
  }

  // Fallback to Augmont list API
  const response = await requestAugmontUserEndpoint("/api/v1/users/banks/list", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim()
  });

  if (!response.ok) {
    return { ...response, banks: [] };
  }

  const result =
    response.data?.payload?.result?.data ||
    (Array.isArray(response.data?.payload?.result) ? response.data.payload.result : null) ||
    response.data?.data ||
    [];

  return {
    ok: true,
    banks: Array.isArray(result) ? result : [],
    raw: response.raw
  };
};

export const deleteAugmontUserBank = async ({
  uniqueId,
  userBankId,
  merchantId
}) =>
  requestAugmontUserEndpoint("/api/v1/users/banks/delete", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim(),
    userBankId: String(userBankId || "").trim()
  });

export const createAugmontAddress = async ({ uniqueId, request, merchantId }) => {
  const resolvedMerchantId = merchantId || DEFAULT_MERCHANT_ID;
  const response = await requestAugmontUserEndpoint("/api/v1/users/addresses/create", {
    merchantId: resolvedMerchantId,
    uniqueId: String(uniqueId || "").trim(),
    request: {
      name: String(request?.name || "").trim(),
      mobileNumber: String(request?.mobileNumber || "").trim(),
      email: String(request?.email || request?.emailId || "").trim(),
      address: String(request?.address || "").trim()
        || String(request?.fullAddress || "").trim(),
      pincode: String(request?.pincode || request?.userPincode || "").trim()
    }
  });

  if (!response.ok) {
    return response;
  }

  const addressListResponse = await fetchAugmontAddresses(uniqueId, resolvedMerchantId);

  return {
    ok: true,
    statusCode: response.statusCode,
    message:
      response.raw?.payload?.message ||
      response.raw?.message ||
      "Augmont address create request accepted",
    addresses: addressListResponse?.addresses || [],
    raw: response.raw,
    addressListRaw: addressListResponse?.raw || null
  };
};

export const fetchAugmontAddresses = async (uniqueId, merchantId) => {
  if (!uniqueId) {
    return {
      ok: false,
      message: "Missing Augmont uniqueId",
      addresses: []
    };
  }

  const response = await requestAugmontUserEndpoint("/api/v1/users/addresses/list", {
    merchantId: merchantId || DEFAULT_MERCHANT_ID,
    uniqueId: String(uniqueId || "").trim()
  });

  if (!response.ok) {
    return {
      ...response,
      addresses: []
    };
  }

  const result =
    response.data?.payload?.result?.data ||
    response.data?.payload?.result ||
    response.data?.data ||
    [];

  return {
    ok: true,
    addresses: Array.isArray(result) ? result : [],
    raw: response.raw
  };
};

export const fetchAugmontPassbook = async (uniqueId) => {
  if (!uniqueId) {
    return {
      ok: false,
      message: "Missing Augmont uniqueId"
    };
  }

  const response = await requestAugmontUserEndpoint("/api/v1/users/passbook", {
    uniqueId: String(uniqueId || "").trim()
  });

  if (!response.ok) {
    return response;
  }

  const result =
    response.data?.payload?.result?.data ||
    response.data?.payload?.result ||
    {};

  return {
    ok: true,
    passbook: result,
    raw: response.raw
  };
};

/* ---------------- PRODUCTS ---------------- */

export const fetchAugmontProducts = async (
  page = 1,
  count = 10,
  merchantId
) => {
  try {
    const resolvedMerchantId = merchantId || DEFAULT_MERCHANT_ID;

    if (!resolvedMerchantId) {
      return {
        ok: false,
        message: "Missing merchantId. Please retry."
      };
    }

    const res = await fetch(`${BASE_URL}/api/v1/products/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchantId: resolvedMerchantId,
        page,
        count
      })
    });

    const data = await getJson(res);

    if (!res.ok || data?.status !== "success") {
      return {
        ok: false,
        message: extractBackendMessage(data, "Failed to fetch products"),
        providerUrl: data?.payload?.providerUrl || "",
        products: [],
        pagination: normalizePagination()
      };
    }

    return {
      ok: true,
      message: data?.payload?.message || "",
      products: Array.isArray(data?.payload?.result?.data)
        ? data.payload.result.data.map(normalizeProduct)
        : [],
      pagination: normalizePagination(data?.payload?.result?.pagination),
      raw: data
    };
  } catch (error) {
    console.error("PRODUCT API ERROR:", error);
    return {
      ok: false,
      message: "Failed to fetch products",
      products: [],
      pagination: normalizePagination()
    };
  }
};

export const fetchAugmontProductDetail = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  sku
} = {}) => {
  if (!sku) {
    return {
      ok: false,
      message: "Missing product sku"
    };
  }

  const response = await requestAugmontWrapperEndpoint(
    "/api/v1/products/detail",
    {
      merchantId,
      sku
    },
    "Failed to fetch product detail"
  );

  if (!response.ok) {
    return response;
  }

  const product = extractOrderResult(response.data);

  return {
    ok: true,
    product: normalizeProduct(product),
    raw: response.raw
  };
};

/* ---------------- GOLD RATES ---------------- */

export const getGoldRates = async (merchantId = DEFAULT_MERCHANT_ID) => {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/rates/live`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchantId
      })
    });

    return await getJson(res);
  } catch (error) {
    console.error("AUGMONT LIVE RATE ERROR:", error);
    return {
      ok: false,
      status: "error",
      payload: {
        message: "Failed to fetch live Augmont rates"
      }
    };
  }
};

export const fetchLiveGoldRateSnapshot = async (options = {}) =>
  withRateCache("live", { merchantId: DEFAULT_MERCHANT_ID }, async () => {
    try {
    const data = await getGoldRates();
    const snapshot = normalizeGoldRatePayload(data);

    if (snapshot.currentPrice <= 0) {
      return {
        ok: false,
        message: extractBackendMessage(data, "Live gold rate is unavailable"),
        snapshot,
        history: readGoldRateHistory(),
        raw: data
      };
    }

    const history = storeGoldRatePoint(snapshot);
    localStorage.setItem("goldPrice", String(snapshot.currentPrice));

    return {
  ok: true,
  snapshot,
  history,
  raw: data,
  blockId: snapshot.blockId || ""
};
  } catch (error) {
    console.error("GOLD RATE ERROR:", error);
    return {
      ok: false,
      message: "Failed to fetch live gold rate",
      history: readGoldRateHistory()
    };
  }
  }, options);

export const fetchAugmontRateHistory = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  fromDate,
  toDate,
  metalType = "gold",
  force = false,
  allowNetwork = true
} = {}) =>
  withRateCache(
    "history",
    { merchantId, fromDate, toDate, metalType },
    async () => {
      try {
    const res = await fetch(`${BASE_URL}/api/v1/rates/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchantId,
        fromDate,
        toDate,
        metalType
      })
    });

    const data = await getJson(res);
    const history = normalizeRateHistoryPayload(data, metalType);

    if (!res.ok || history.length === 0) {
      return {
        ok: false,
        history,
        raw: data,
        message: extractBackendMessage(
          data,
          "Historical Augmont rates are unavailable"
        )
      };
    }

    return {
      ok: true,
      history,
      raw: data
    };
  } catch (error) {
    console.error("AUGMONT RATE HISTORY ERROR:", error);
    return {
      ok: false,
      history: [],
      message: "Failed to fetch historical Augmont rates"
    };
  }
    },
    { force, allowNetwork }
  );

export const fetchAugmontSipRates = async (
  merchantId = DEFAULT_MERCHANT_ID,
  options = {}
) =>
  withRateCache("sip", { merchantId }, async () => {
    try {
    const res = await fetch(`${BASE_URL}/api/v1/rates/sip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchantId
      })
    });

    const data = await getJson(res);
    const snapshot = normalizeSipRatePayload(data);

    if (
      !res.ok ||
      (!snapshot.gold.currentPrice && !snapshot.silver.currentPrice)
    ) {
      return {
        ok: false,
        snapshot,
        raw: data,
        message: extractBackendMessage(data, "SIP rates are unavailable")
      };
    }

    return {
      ok: true,
      snapshot,
      raw: data
    };
  } catch (error) {
    console.error("AUGMONT SIP RATE ERROR:", error);
    return {
      ok: false,
      snapshot: {
        gold: { currentPrice: 0, buyPrice: 0 },
        silver: { currentPrice: 0, buyPrice: 0 }
      },
      message: "Failed to fetch SIP rates"
    };
  }
  }, options);

/* ---------------- AUGMONT ORDERS ---------------- */

const buildOrderReference = (order, fallback = {}) => {
  const reference = {
    merchantId: String(
      order?.merchantId || fallback?.merchantId || DEFAULT_MERCHANT_ID
    ),
    merchantTransactionId: String(
      order?.merchantTransactionId ||
        order?.merchantTxnId ||
        fallback?.merchantTransactionId ||
        ""
    ),
    transactionId: String(
      order?.transactionId ||
        order?.txnId ||
        order?.transactionID ||
        fallback?.transactionId ||
        ""
    ),
    uniqueId: String(
      order?.uniqueId ||
        order?.userUniqueId ||
        order?.customerUniqueId ||
        fallback?.uniqueId ||
        ""
    )
  };

  storeOrderReference(reference);
  return reference;
};

export const getAugmontOrderReferences = () => getStoredOrderReferences();

export const createAugmontBuyOrder = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {},
  ...rest
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/buy/create", {
    merchantId,
    request,
    ...rest
  });

  if (!response.ok) {
    return response;
  }

  const order = extractOrderResult(response.data);
  const references = buildOrderReference(order, {
    merchantId,
    uniqueId: request?.uniqueId
  });

  return {
    ok: true,
    order,
    references,
    raw: response.raw,
    message:
      response.data?.message ||
      response.data?.payload?.message ||
      "Buy order created successfully"
  };
};

export const fetchAugmontBuyOrderDetail = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  merchantTransactionId,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/buy/detail", {
    merchantId,
    merchantTransactionId,
    uniqueId
  });

  if (!response.ok) {
    return response;
  }

  const order = extractOrderResult(response.data);
  const references = buildOrderReference(order, {
    merchantId,
    merchantTransactionId,
    uniqueId
  });

  return {
    ok: true,
    order,
    references,
    raw: response.raw
  };
};

export const fetchAugmontBuyOrders = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/buy/list", {
    merchantId,
    uniqueId
  });

  if (!response.ok) {
    return {
      ...response,
      orders: []
    };
  }

  const orders = extractOrderArray(response.data).map((order, index) =>
    normalizeAugmontOrder("buy", order, index)
  );

  return {
    ok: true,
    orders,
    raw: response.raw
  };
};

export const fetchAugmontBuyInvoice = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  transactionId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/invoices/buy", {
    merchantId,
    transactionId
  });

  if (!response.ok) {
    return response;
  }

  return {
    ok: true,
    invoice: extractOrderResult(response.data),
    raw: response.raw
  };
};

export const createAugmontSellOrder = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {},
  ...rest
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/sell/create", {
    merchantId,
    request,
    ...rest
  });

  if (!response.ok) {
    return response;
  }

  const order = extractOrderResult(response.data);
  const references = buildOrderReference(order, {
    merchantId,
    uniqueId: request?.uniqueId
  });

  return {
    ok: true,
    order,
    references,
    raw: response.raw,
    message: response.data?.payload?.message || "Sell order created successfully"
  };
};

export const fetchAugmontSellOrderDetail = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  merchantTransactionId,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/sell/detail", {
    merchantId,
    merchantTransactionId,
    uniqueId
  });

  if (!response.ok) {
    return response;
  }

  const order = extractOrderResult(response.data);
  const references = buildOrderReference(order, {
    merchantId,
    merchantTransactionId,
    uniqueId
  });

  return {
    ok: true,
    order,
    references,
    raw: response.raw
  };
};

export const fetchAugmontSellOrders = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/sell/list", {
    merchantId,
    uniqueId
  });

  if (!response.ok) {
    return {
      ...response,
      orders: []
    };
  }

  const orders = extractOrderArray(response.data).map((order, index) =>
    normalizeAugmontOrder("sell", order, index)
  );

  return {
    ok: true,
    orders,
    raw: response.raw
  };
};

export const fetchAugmontSellInvoice = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  transactionId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/invoices/sell", {
    merchantId,
    transactionId
  });

  if (!response.ok) {
    return response;
  }

  return {
    ok: true,
    invoice: extractOrderResult(response.data),
    raw: response.raw
  };
};

export const createAugmontRedeemOrder = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {}
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/redeem/create", {
    merchantId,
    request
  });

  if (!response.ok) return response;

  const order = extractOrderResult(response.data);
  const references = buildOrderReference(order, {
    merchantId,
    uniqueId: request?.uniqueId
  });

  return {
    ok: true,
    order,
    references,
    raw: response.raw
  };
};

export const fetchAugmontRedeemOrderDetail = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  merchantTransactionId,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/redeem/detail", {
    merchantId,
    merchantTransactionId,
    uniqueId
  });

  if (!response.ok) return response;

  return {
    ok: true,
    order: extractOrderResult(response.data),
    raw: response.raw
  };
};

export const fetchAugmontRedeemOrders = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/redeem/list", {
    merchantId,
    uniqueId
  });

  if (!response.ok) {
    return {
      ...response,
      orders: []
    };
  }

  return {
    ok: true,
    orders: extractOrderArray(response.data).map((order, index) =>
      normalizeAugmontOrder("redeem", order, index)
    ),
    raw: response.raw
  };
};

export const fetchAugmontRedeemInvoice = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  transactionId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/invoices/redeem", {
    merchantId,
    transactionId
  });

  if (!response.ok) return response;

  return {
    ok: true,
    invoice: extractOrderResult(response.data),
    raw: response.raw
  };
};

export const createAugmontTransferOrder = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {}
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/transfer/create", {
    merchantId,
    request
  });

  if (!response.ok) return response;

  const order = extractOrderResult(response.data);
  const references = buildOrderReference(order, {
    merchantId,
    uniqueId: request?.senderUniqueId || request?.uniqueId
  });

  return {
    ok: true,
    order,
    references,
    raw: response.raw
  };
};

export const fetchAugmontTransferOrderDetail = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  merchantTransactionId,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/transfer/detail", {
    merchantId,
    merchantTransactionId,
    uniqueId
  });

  if (!response.ok) return response;

  return {
    ok: true,
    order: extractOrderResult(response.data),
    raw: response.raw
  };
};

export const fetchAugmontTransferOrders = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/orders/transfer/list", {
    merchantId,
    uniqueId
  });

  if (!response.ok) {
    return {
      ...response,
      orders: []
    };
  }

  return {
    ok: true,
    orders: extractOrderArray(response.data).map((order, index) =>
      normalizeAugmontOrder("transfer", order, index)
    ),
    raw: response.raw
  };
};

export const fetchAugmontWithdrawDetail = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  sellTransactionId,
  uniqueId
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/withdraw/detail", {
    merchantId,
    sellTransactionId,
    uniqueId
  });

  if (!response.ok) return response;

  return {
    ok: true,
    withdraw: extractOrderResult(response.data),
    raw: response.raw
  };
};

export const updateAugmontWithdraw = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  sellTransactionId,
  uniqueId,
  request = {}
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/withdraw/update", {
    merchantId,
    sellTransactionId,
    uniqueId,
    request
  });

  if (!response.ok) return response;

  return {
    ok: true,
    withdraw: extractOrderResult(response.data),
    raw: response.raw
  };
};

export const fetchAugmontFdSchemes = async ({
  merchantId = DEFAULT_MERCHANT_ID
} = {}) => {
  const response = await requestAugmontOrderEndpoint("/api/v1/fd/schemes", {
    merchantId
  });

  if (!response.ok) {
    return {
      ...response,
      schemes: []
    };
  }

  const result = extractOrderResult(response.data);

  return {
    ok: true,
    schemes: Array.isArray(result) ? result : [],
    raw: response.raw
  };
};

export const preOrderAugmontFd = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {}
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/pre-order", {
    merchantId,
    request
  });

export const createAugmontFdOrder = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {}
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/orders/create", {
    merchantId,
    request
  });

export const fetchAugmontFdOrderDetail = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  merchantTransactionId
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/orders/detail", {
    merchantId,
    merchantTransactionId
  });

export const fetchAugmontFdOrders = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  uniqueId,
  status,
  page = 1,
  count = 25
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/orders/list", {
    merchantId,
    uniqueId,
    status,
    page,
    count
  });

export const preCloseAugmontFdOrder = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  transactionId
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/orders/pre-close", {
    merchantId,
    transactionId
  });

export const closeAugmontFdOrder = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  transactionId
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/orders/close", {
    merchantId,
    transactionId
  });

export const fetchAugmontFdTransactions = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  transactionId
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/transactions", {
    merchantId,
    transactionId
  });

export const fetchAugmontFdPassbook = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  uniqueId
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/passbook", {
    merchantId,
    uniqueId
  });

export const fetchAugmontFdTerms = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  schemeId,
  uniqueId
} = {}) =>
  requestAugmontOrderEndpoint("/api/v1/fd/terms", {
    merchantId,
    schemeId,
    uniqueId
  });

export const submitAugmontBuyOrderFlow = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {},
  ...rest
} = {}) => {
  const createResponse = await createAugmontBuyOrder({
    merchantId,
    request,
    ...rest
  });

  if (!createResponse.ok) {
    return createResponse;
  }

  const detailResponse = await fetchAugmontBuyOrderDetail({
    merchantId,
    merchantTransactionId: createResponse.references?.merchantTransactionId,
    uniqueId: createResponse.references?.uniqueId || request?.uniqueId
  });

  return {
    ok: detailResponse.ok,
    create: createResponse,
    detail: detailResponse,
    references: createResponse.references,
    raw: {
      create: createResponse.raw,
      detail: detailResponse.raw
    },
    message:
      detailResponse.message ||
      createResponse.message ||
      "Buy order flow completed"
  };
};

export const submitAugmontSellOrderFlow = async ({
  merchantId = DEFAULT_MERCHANT_ID,
  request = {},
  ...rest
} = {}) => {
  const createResponse = await createAugmontSellOrder({
    merchantId,
    request,
    ...rest
  });

  if (!createResponse.ok) {
    return createResponse;
  }

  const detailResponse = await fetchAugmontSellOrderDetail({
    merchantId,
    merchantTransactionId: createResponse.references?.merchantTransactionId,
    uniqueId: createResponse.references?.uniqueId || request?.uniqueId
  });

  return {
    ok: detailResponse.ok,
    create: createResponse,
    detail: detailResponse,
    references: createResponse.references,
    raw: {
      create: createResponse.raw,
      detail: detailResponse.raw
    },
    message:
      detailResponse.message ||
      createResponse.message ||
      "Sell order flow completed"
  };
};
