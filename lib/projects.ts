export type ProjectStatus = "proposal" | "active" | "completed" | "settled";
export type ProjectCategory = "personal" | "client";

export type Project = {
  id: string;
  user_id: string;
  client_id: string | null;
  name: string;
  status: ProjectStatus;
  category: ProjectCategory;
  start_date: string | null;
  end_date: string | null;
  estimated_amount: number | null;
  memo: string | null;
  created_at: string;
};

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  personal: "개인",
  client: "클라이언트",
};

export const PROJECT_CATEGORY_BADGE: Record<ProjectCategory, string> = {
  personal: "bg-gray-100 text-gray-500",
  client: "bg-amber-50 text-amber-600",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  proposal: "상담중",
  active: "진행중",
  completed: "완료",
  settled: "정산완료",
};

export const PROJECT_STATUS_NEXT: Partial<Record<ProjectStatus, ProjectStatus>> = {
  proposal: "active",
  active: "completed",
  completed: "settled",
};

export const PROJECT_STATUS_BADGE: Record<ProjectStatus, string> = {
  proposal: "bg-blue-50 text-blue-600",
  active: "bg-[#cdfaf6] text-[#26A69A]",
  completed: "bg-gray-100 text-gray-500",
  settled: "bg-emerald-50 text-emerald-600",
};
