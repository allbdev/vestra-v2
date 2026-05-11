import { Skeleton } from "../ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-1/2" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
