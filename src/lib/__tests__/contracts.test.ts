import { describe, it, expect } from "vitest";
import { computeContractEnd, contractState, contractCoversMonth } from "@/lib/contracts";

describe("computeContractEnd", () => {
  it("rounds cancellation + notice up to month end", () => {
    expect(computeContractEnd("2026-11-02", 4)).toBe("2026-11-30");
    expect(computeContractEnd("2026-11-20", 4)).toBe("2026-12-31");
  });
  it("handles leap years and year change", () => {
    expect(computeContractEnd("2028-02-01", 1)).toBe("2028-02-29");
    expect(computeContractEnd("2026-12-20", 4)).toBe("2027-01-31");
  });
});

describe("contractState", () => {
  const today = "2026-11-03";
  it("none / upcoming / active / cancelled / ended", () => {
    expect(contractState({}, today)).toBe("none");
    expect(contractState({ contractStart: "2026-12-01" }, today)).toBe("upcoming");
    expect(contractState({ contractStart: "2026-01-01" }, today)).toBe("active");
    expect(contractState({ cancelledOn: "2026-11-01", contractEnd: "2026-11-30" }, today)).toBe("cancelled");
    expect(contractState({ contractEnd: "2026-10-31" }, today)).toBe("ended");
  });
});

describe("contractCoversMonth", () => {
  it("treats missing dates as unlimited", () => {
    expect(contractCoversMonth({}, "2026-11")).toBe(true);
  });
  it("excludes months before start and after end", () => {
    expect(contractCoversMonth({ contractStart: "2026-12-01" }, "2026-11")).toBe(false);
    expect(contractCoversMonth({ contractStart: "2026-11-30" }, "2026-11")).toBe(true);
    expect(contractCoversMonth({ contractEnd: "2026-10-31" }, "2026-11")).toBe(false);
    expect(contractCoversMonth({ contractEnd: "2026-11-01" }, "2026-11")).toBe(true);
  });
});
