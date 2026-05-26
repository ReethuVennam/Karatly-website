import { describe, expect, it } from "vitest";
import {
  getFinancialYearStart,
  isKycVerified,
  checkSellBankReady,
  sumFinancialYearPurchases,
  NON_KYC_FY_LIMIT,
  KYC_PURCHASE_THRESHOLD
} from "./kycGuards";

describe("kycGuards", () => {
  it("detects verified KYC from profile flags", () => {
    expect(isKycVerified({ panVerified: true }, {})).toBe(true);
    expect(isKycVerified({}, { status: "approved" })).toBe(true);
    expect(isKycVerified({}, { status: "pending" })).toBe(false);
  });

  it("sums FY purchases excluding cancelled orders", () => {
    const fyStart = getFinancialYearStart();
    const total = sumFinancialYearPurchases(
      [
        { amount: 2000, date: new Date().toISOString(), status: "completed" },
        { amount: 1000, date: new Date().toISOString(), status: "cancelled" },
        { amount: 500, date: "2020-01-01", status: "completed" }
      ],
      fyStart
    );
    expect(total).toBe(2000);
  });

  it("blocks sell when no bank is linked", () => {
    const result = checkSellBankReady([]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_BANK");
    expect(result.action).toBe("/bank");
  });

  it("allows sell with primary bank", () => {
    const result = checkSellBankReady([{ userBankId: "bank-1", isPrimary: true, accountNumber: "1234" }]);
    expect(result.ok).toBe(true);
    expect(result.bankId).toBe("bank-1");
  });

  it("documents purchase thresholds", () => {
    expect(NON_KYC_FY_LIMIT).toBe(5000);
    expect(KYC_PURCHASE_THRESHOLD).toBe(5000);
  });
});
