function todayInKST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

const ANNUAL_DEADLINES = [
  { month: 1, day: 25, label: "제2기 부가세 확정신고", desc: "하반기(7~12월) 매출·매입 부가세 신고·납부" },
  { month: 5, day: 31, label: "종합소득세 신고·납부", desc: "1년 사업소득 신고 (세액감면 대상도 신고는 필수)" },
  { month: 7, day: 25, label: "제1기 부가세 확정신고", desc: "상반기(1~6월) 매출·매입 부가세 신고·납부" },
  { month: 8, day: 31, label: "균등분 주민세 납부", desc: "개인사업자 지방세 — 매년 8월 고지서 납부 (위택스 또는 지자체 방문)" },
  { month: 11, day: 30, label: "종합소득세 중간예납", desc: "국세청 고지서 확인 및 납부" },
];

function getNextDeadline(todayStr: string) {
  const [year, month, day] = todayStr.split("-").map(Number);
  const todayNum = month * 100 + day;

  let next = ANNUAL_DEADLINES.find((d) => d.month * 100 + d.day >= todayNum);
  let targetYear = year;
  if (!next) {
    next = ANNUAL_DEADLINES[0];
    targetYear = year + 1;
  }

  const target = new Date(`${targetYear}-${String(next.month).padStart(2, "0")}-${String(next.day).padStart(2, "0")}T00:00:00+09:00`);
  const today = new Date(`${todayStr}T00:00:00+09:00`);
  const dDay = Math.round((target.getTime() - today.getTime()) / 86400000);

  return { ...next, dDay };
}

export default function TaxScheduleWidget() {
  const today = todayInKST();
  const dayOfMonth = Number(today.split("-")[2]);
  const deadline = getNextDeadline(today);
  const urgent = deadline.dDay <= 14;

  return (
    <div className={`rounded-2xl p-4 space-y-2 ${urgent ? "bg-[#fde8f0]" : "bg-white border border-gray-100 shadow-sm"}`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${urgent ? "text-[#e85b8a]" : "text-gray-900"}`}>
          📅 {deadline.label}
        </p>
        <span className={`text-sm font-bold ${urgent ? "text-[#e85b8a]" : "text-[#26A69A]"}`}>
          D-{deadline.dDay}
        </span>
      </div>
      <p className={`text-xs ${urgent ? "text-[#e85b8a]" : "text-gray-500"}`}>{deadline.desc}</p>

      {dayOfMonth <= 10 && (
        <p className="text-xs text-gray-500 pt-1">
          👥 프리랜서·외주 인건비 지급이 있었다면 원천세(3.3%) 신고 및 간이지급명세서 제출 — D-{10 - dayOfMonth}
        </p>
      )}
    </div>
  );
}
