const BASE_URL =
  import.meta.env.VITE_GOLD_BASE_URL?.trim() ||
  "https://uatbckend.karatly.net";
const DEFAULT_MERCHANT_ID =
  import.meta.env.VITE_AUGMONT_MERCHANT_ID?.trim() || "11692";

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

const extractList = (data) => {
  const list =
    data?.payload?.result?.data ||
    data?.payload?.result?.records ||
    data?.payload?.result ||
    data?.data ||
    [];

  return Array.isArray(list) ? list : [];
};

const normalizeMasterItem = (item) => ({
  id: String(
    item?.id ??
      item?.stateId ??
      item?.cityId ??
      item?.value ??
      item?.masterId ??
      ""
  ),
  name:
    item?.name ||
    item?.stateName ||
    item?.cityName ||
    item?.label ||
    ""
});

const requestRegistrationApi = async (path, body, fallbackMessage) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      merchantId: DEFAULT_MERCHANT_ID,
      ...body
    })
  });

  const data = await getJson(res);

  if (!res.ok || data?.status === "error") {
    return {
      ok: false,
      message: extractBackendMessage(data, fallbackMessage),
      raw: data
    };
  }

  return {
    ok: true,
    data,
    raw: data
  };
};

export const fetchStates = async () => {
  const response = await requestRegistrationApi(
    "/api/v1/master/states",
    {
      page: 1,
      count: 100,
      name: ""
    },
    "Failed to fetch states"
  );

  if (!response.ok) {
    return {
      ...response,
      states: []
    };
  }

  return {
    ok: true,
    states: extractList(response.data)
      .map(normalizeMasterItem)
      .filter((item) => item.id && item.name),
    raw: response.raw
  };
};

export const fetchCities = async (stateId) => {
  const response = await requestRegistrationApi(
    "/api/v1/master/cities",
    {
      stateId,
      page: 1,
      count: 200,
      name: ""
    },
    "Failed to fetch cities"
  );

  if (!response.ok) {
    return {
      ...response,
      cities: []
    };
  }

  return {
    ok: true,
    cities: extractList(response.data)
      .map(normalizeMasterItem)
      .filter((item) => item.id && item.name),
    raw: response.raw
  };
};

export const createGoldUser = async (request) => {
  const response = await requestRegistrationApi(
    "/api/v1/users/create",
    {
      request
    },
    "Failed to create user"
  );

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
    data: result,
    message:
      response.data?.payload?.message ||
      response.data?.message ||
      "User created successfully",
    raw: response.raw
  };
};
