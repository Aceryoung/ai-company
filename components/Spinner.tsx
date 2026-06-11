export function Spinner({ className = "w-4 h-4 border-white" }: { className?: string }) {
  return <span className={`rounded-full border-2 border-t-transparent animate-spin ${className}`} />;
}
