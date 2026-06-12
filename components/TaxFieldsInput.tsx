"use client";

import { useState } from "react";
import { PROOF_TYPES, type ProofType, type TransactionType } from "@/lib/transactions";

const INPUT_CLASS =
  "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#00b4d8] transition-colors placeholder:text-gray-400 disabled:opacity-40";

type Props = {
  type: TransactionType;
  supplyValue: string;
  vatAmount: string;
  proofType: ProofType | "";
  onSupplyValueChange: (value: string) => void;
  onVatAmountChange: (value: string) => void;
  onProofTypeChange: (value: ProofType | "") => void;
  disabled?: boolean;
};

export default function TaxFieldsInput({
  type,
  supplyValue,
  vatAmount,
  proofType,
  onSupplyValueChange,
  onVatAmountChange,
  onProofTypeChange,
  disabled,
}: Props) {
  const [vatTouched, setVatTouched] = useState(false);

  const handleSupplyValueChange = (value: string) => {
    onSupplyValueChange(value);
    if (!vatTouched) {
      const parsed = Number(value);
      onVatAmountChange(value !== "" && Number.isFinite(parsed) ? String(Math.round(parsed * 0.1)) : "");
    }
  };

  const handleVatAmountChange = (value: string) => {
    setVatTouched(true);
    onVatAmountChange(value);
  };

  return (
    <>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={supplyValue}
          onChange={(e) => handleSupplyValueChange(e.target.value)}
          disabled={disabled}
          placeholder="공급가액"
          className={INPUT_CLASS}
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={vatAmount}
          onChange={(e) => handleVatAmountChange(e.target.value)}
          disabled={disabled}
          placeholder="부가세"
          className={INPUT_CLASS}
        />
      </div>

      {type === "expense" && (
        <select
          value={proofType}
          onChange={(e) => onProofTypeChange(e.target.value as ProofType | "")}
          disabled={disabled}
          className={INPUT_CLASS}
        >
          <option value="">증빙유형 선택 (선택)</option>
          {PROOF_TYPES.map((proofTypeOption) => (
            <option key={proofTypeOption} value={proofTypeOption}>
              {proofTypeOption}
            </option>
          ))}
        </select>
      )}
    </>
  );
}
