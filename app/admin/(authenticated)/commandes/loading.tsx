import { Skeleton } from '@/components/ui/skeleton'

export default function CommandesLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-6 w-28" />
            {Array.from({ length: 2 }).map((_, row) => (
              <Skeleton key={row} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
