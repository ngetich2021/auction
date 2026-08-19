import { Skeleton } from "@/components/ui/Skeleton";

export default function BrowseLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Skeleton className="h-6 w-2/3" />
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}
