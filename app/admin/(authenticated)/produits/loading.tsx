import { Skeleton } from '@/components/ui/skeleton'

export default function ProduitsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32 mb-6" />
      <Skeleton className="h-10 w-full max-w-lg mb-4" />
      <div className="rounded-lg border bg-card overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20 hidden sm:block" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}
