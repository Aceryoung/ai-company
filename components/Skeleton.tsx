export function Skeleton({ className = "h-6 w-24" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}
