'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">😕</p>
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
          Une erreur est survenue
        </h1>
        <p className="text-muted-foreground mb-8">
          Nous sommes désolés, quelque chose s&apos;est mal passé.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
