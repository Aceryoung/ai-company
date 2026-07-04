export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export type Quote = {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  recipient_name: string;
  quote_date: string;
  quote_number: string;
  validity_days: number;
  production_period: string;
  notes: string | null;
  status: QuoteStatus;
  created_at: string;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  sort_order: number;
  name: string;
  description: string | null;
  unit_price: number | null;
  quantity: number | null;
  amount: number | null;
  price_label: string | null;
  is_section: boolean;
};

export type QuoteWithItems = Quote & { items: QuoteItem[] };

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "작성중",
  sent: "발송됨",
  accepted: "수락됨",
  rejected: "거절됨",
};

export const QUOTE_STATUS_BADGE: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-50 text-blue-600",
  accepted: "bg-[#cdfaf6] text-[#26A69A]",
  rejected: "bg-red-50 text-red-500",
};

export function calcItemTotal(item: QuoteItem): number | null {
  if (item.is_section) return null;
  if (item.price_label) return null;
  if (item.unit_price != null && item.quantity != null) return item.unit_price * item.quantity;
  if (item.amount != null) return item.amount;
  return null;
}

export function calcQuoteTotal(items: QuoteItem[]): number {
  return items.reduce((sum, item) => {
    const t = calcItemTotal(item);
    return sum + (t ?? 0);
  }, 0);
}

export function generateQuoteNumber(existingNumbers: string[]): string {
  const now = new Date();
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const existing = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.split("-")[1] ?? "0", 10))
    .filter((n) => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}-${String(next).padStart(2, "0")}`;
}
