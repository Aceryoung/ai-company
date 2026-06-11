"use client";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  shake?: boolean;
}

export default function PinPad({
  value,
  onChange,
  length = 4,
  disabled = false,
  shake = false,
}: PinPadProps) {
  const handleKeyPress = (key: string) => {
    if (disabled) return;

    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }

    if (value.length < length) {
      onChange(value + key);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        className={`flex gap-4 ${shake ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
      >
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            data-filled={i < value.length}
            className="w-3 h-3 rounded-full bg-gray-200 data-[filled=true]:bg-[#00BFFF]"
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((key, i) => {
          if (key === "") {
            return <div key={i} />;
          }

          if (key === "del") {
            return (
              <button
                key={i}
                type="button"
                aria-label="지우기"
                disabled={disabled}
                onClick={() => handleKeyPress(key)}
                className="aspect-square min-h-11 rounded-2xl bg-white border border-gray-100 shadow-sm
                           text-sm font-semibold text-gray-500 active:bg-gray-50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]
                           disabled:opacity-40 transition-colors flex items-center justify-center"
              >
                지우기
              </button>
            );
          }

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => handleKeyPress(key)}
              className="aspect-square min-h-11 rounded-2xl bg-white border border-gray-100 shadow-sm
                         text-2xl font-semibold text-gray-900 active:bg-gray-50
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]
                         disabled:opacity-40 transition-colors"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
