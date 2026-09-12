'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileUp } from 'lucide-react'
import { parseRecipeImport, startRecipeImport } from '@/app/actions/recipe-imports'

/**
 * Envoi de fiches recettes, plusieurs fichiers d'un coup.
 *
 * Comme pour les factures, l'envoi et la lecture sont deux étapes : les
 * fichiers sont d'abord mis à l'abri, la lecture est tentée ensuite. Si elle
 * échoue, le lot existe quand même et rien n'est perdu.
 */
export function RecipeImportButton() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState('')

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    startTransition(async () => {
      setStep('Envoi des fiches…')
      const formData = new FormData()
      for (const file of files) formData.append('files', file)

      const imported = await startRecipeImport(formData)
      if (imported.error || !imported.importId) {
        setStep('')
        toast.error(imported.error ?? 'Import impossible.')
        return
      }
      for (const refus of imported.rejected ?? []) toast.warning(refus)

      setStep('Lecture des fiches…')
      const parsed = await parseRecipeImport(imported.importId)
      setStep('')
      if (parsed.error) toast.error(parsed.error)
      else toast.success(parsed.message ?? 'Fiches lues.')

      router.push(`/interface/recettes/imports/${imported.importId}`)
    })
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*,application/pdf,text/plain,text/csv,text/markdown,.csv,.txt,.md,.pdf"
        onChange={handleFiles}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full px-4 active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{
          minHeight: '42px',
          border: '1px solid var(--espresso-20)',
          color: 'var(--espresso)',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        <FileUp className="h-4 w-4" strokeWidth={1.9} />
        {isPending ? step || 'Import…' : 'Importer des fiches'}
      </button>
    </>
  )
}
