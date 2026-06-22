export type ResourceCategory = "dev" | "business" | "design" | "tools" | "etc";

export type Resource = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  category: ResourceCategory;
  memo: string | null;
  created_at: string;
};

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  dev: "개발",
  business: "사업",
  design: "디자인",
  tools: "도구",
  etc: "기타",
};

export const RESOURCE_CATEGORY_BADGE: Record<ResourceCategory, string> = {
  dev: "bg-blue-50 text-blue-600",
  business: "bg-amber-50 text-amber-600",
  design: "bg-purple-50 text-purple-600",
  tools: "bg-green-50 text-green-600",
  etc: "bg-gray-100 text-gray-500",
};

export const RESOURCE_CATEGORIES: ResourceCategory[] = ["dev", "business", "design", "tools", "etc"];
