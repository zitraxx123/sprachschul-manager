export type ContractState = "none" | "upcoming" | "active" | "cancelled" | "ended";

export interface ContractDates {
  contractStart?: string | null;
  contractEnd?: string | null;
  cancelledOn?: string | null;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Contract end for a cancellation: cancellation date + notice period,
 * rounded up to the end of that month (common "Kündigung zum Monatsende" rule).
 * The result is only a suggestion; the admin can overwrite it.
 */
export function computeContractEnd(cancelledOn: string, noticeWeeks: number): string {
  const [y, m, d] = cancelledOn.split("-").map(Number);
  const afterNotice = new Date(Date.UTC(y, m - 1, d + noticeWeeks * 7));
  const monthEnd = new Date(Date.UTC(afterNotice.getUTCFullYear(), afterNotice.getUTCMonth() + 1, 0));
  return monthEnd.toISOString().slice(0, 10);
}

export function contractState(c: ContractDates, today: string): ContractState {
  if (!c.contractStart && !c.contractEnd && !c.cancelledOn) return "none";
  if (c.contractEnd && c.contractEnd < today) return "ended";
  if (c.cancelledOn) return "cancelled";
  if (c.contractStart && c.contractStart > today) return "upcoming";
  return "active";
}

/** True if the contract runs during any day of the given month ("YYYY-MM"). Missing dates = unlimited. */
export function contractCoversMonth(c: ContractDates, monthYear: string): boolean {
  const [y, m] = monthYear.split("-").map(Number);
  const monthStart = `${monthYear}-01`;
  const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  if (c.contractStart && c.contractStart > monthEnd) return false;
  if (c.contractEnd && c.contractEnd < monthStart) return false;
  return true;
}
