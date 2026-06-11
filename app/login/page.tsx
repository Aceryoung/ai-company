"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PinPad from "@/components/PinPad";
import { loginWithPin } from "./actions";

const PIN_LENGTH = 4;

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);

  const handleChange = async (next: string) => {
    setError(false);
    setPin(next);

    if (next.length !== PIN_LENGTH) return;

    setLoading(true);
    const result = await loginWithPin(next);
    setLoading(false);

    if (result.error) {
      setError(true);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 300);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex flex-col min-h-dvh items-center justify-center bg-[#f7f8fc] px-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        <h1 className="text-2xl font-bold text-gray-900">PIN 입력</h1>

        <PinPad
          value={pin}
          onChange={handleChange}
          length={PIN_LENGTH}
          disabled={loading}
          shake={shake}
        />

        {error && (
          <p className="text-sm text-red-500">PIN이 올바르지 않습니다</p>
        )}

        {loading && (
          <div className="w-6 h-6 rounded-full border-2 border-[#00BFFF] border-t-transparent animate-spin" />
        )}
      </div>
    </div>
  );
}
