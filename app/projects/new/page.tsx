import { Suspense } from "react";
import { Spinner } from "@/components/Spinner";
import NewProjectForm from "./NewProjectForm";

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#E0F2F1] flex items-center justify-center"><Spinner /></div>}>
      <NewProjectForm />
    </Suspense>
  );
}
