import { Skeleton } from "@/components/ui/Skeleton";

export default function EateriesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-9 w-full rounded-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
