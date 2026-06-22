export type TransactionType = "income" | "expense";

export type ProofType = "세금계산서" | "신용카드" | "현금영수증(지출증빙)" | "영수증없음";

export const PROOF_TYPES: ProofType[] = [
  "세금계산서",
  "신용카드",
  "현금영수증(지출증빙)",
  "영수증없음",
];

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  counterparty: string;
  amount: number;
  supply_value: number;
  vat_amount: number;
  proof_type: ProofType | null;
  transaction_date: string;
  memo: string | null;
  is_completed: boolean;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

const COMPLETED_BADGE_CLASS =
  "bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-medium";
const PENDING_BADGE_CLASS =
  "bg-[#fde8f0] text-[#e85b8a] px-1.5 py-0.5 rounded text-[10px] font-medium";

export function getBadge(transaction: Pick<Transaction, "type" | "is_completed">) {
  if (transaction.type === "income") {
    return transaction.is_completed
      ? { label: "입금완료", className: COMPLETED_BADGE_CLASS }
      : { label: "미수금", className: PENDING_BADGE_CLASS };
  }

  return transaction.is_completed
    ? { label: "지급완료", className: COMPLETED_BADGE_CLASS }
    : { label: "미지급", className: PENDING_BADGE_CLASS };
}
