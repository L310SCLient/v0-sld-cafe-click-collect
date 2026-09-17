'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, ImagePlus } from 'lucide-react'
import { importInvoicePhoto, parseInvoice } from '@/app/actions/invoices'

/**
 * Import de factures par l'appareil photo ou depuis la pellicule.
 *
 * `capture="environment"` demande l'appareil arrière : sur iPhone, Safari
 * propose directement « Prendre une photo ». Le second bouton sans `capture`
 * ouvre la pellicule, pour les factures déjà photographiées ou reçues par
 * mail, et accepte plusieurs fichiers d'un coup.
 *
 * L'import et la lecture sont deux étapes distinctes : la photo est enregistrée
 * d'abord, et la lecture est tentée ensuite. Si le parsing est indisponible,
 * la facture existe quand même et ses lignes peuvent être saisies à la main.
 */
/** Côté long maximal envoyé à l'API : au-delà, elle redimensionne elle-même. */
const MAX_COTE = 1600

/**
 * Réduit la photo dans le navigateur avant l'envoi.
 *
 * Deux problèmes réglés d'un coup : un iPhone récent produit des JPEG de 3 à
 * 5 Mo, au bord de la limite de l'API, et la pellicule peut rendre du HEIC,
 * que l'API ne lit pas — le canvas le décode et ressort du JPEG. Si le
 * navigateur ne sait pas décoder le fichier, on renvoie l'original et le
 * serveur dira franchement pourquoi il le refuse.
 */
export async function reduireImage(file: File): Promise<File> {
  const dejaLisible = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const ratio = Math.min(1, MAX_COTE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * ratio)
  canvas.height = Math.round(bitmap.height * ratio)

  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  )
  if (!blob) return file

  // On ne remplace un fichier déjà lisible que si on l'allège vraiment.
  if (dejaLisible && blob.size >= file.size) return file

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export function InvoiceImport() {
  const router = useRouter()
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState('')

  /**
   * Traite les fichiers un par un plutôt qu'en un seul envoi : chaque facture
   * doit être lue séparément, et un échec au milieu du lot ne doit pas faire
   * perdre les photos déjà passées. Les échecs sont récapitulés à la fin,
   * nommés, pour savoir laquelle reprendre.
   */
  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    // Réinitialise pour que reprendre la même photo redéclenche l'événement.
    event.target.value = ''
    if (files.length === 0) return

    startTransition(async () => {
      const echecs: string[] = []
      const importees: string[] = []

      for (const [index, file] of files.entries()) {
        const avancement = files.length > 1 ? ` (${index + 1} sur ${files.length})` : ''

        setStep(`Préparation${avancement}…`)
        const prete = await reduireImage(file)

        setStep(`Envoi${avancement}…`)
        const formData = new FormData()
        formData.append('photo', prete)

        const imported = await importInvoicePhoto(formData)
        if (imported.error || !imported.invoiceId) {
          echecs.push(`${file.name || 'photo'} : ${imported.error ?? 'import impossible'}`)
          continue
        }
        importees.push(imported.invoiceId)

        setStep(`Lecture${avancement}…`)
        const parsed = await parseInvoice(imported.invoiceId)
        if (parsed.error) {
          // La facture est bien là, seule sa lecture a échoué : on le signale
          // sans la faire passer pour perdue.
          echecs.push(`${file.name || 'photo'} : ${parsed.error}`)
        } else if (files.length === 1) {
          toast.success(parsed.message ?? 'Facture lue.')
        }
      }

      setStep('')

      if (echecs.length > 0) {
        toast.error(
          `${echecs.length} photo${echecs.length > 1 ? 's' : ''} en échec sur ${files.length} — ${echecs.join(' · ')}`
        )
      } else if (files.length > 1) {
        toast.success(`${importees.length} factures importées et lues.`)
      }

      // Une seule facture : on emmène directement dessus, même si sa lecture a
      // échoué, pour saisir les lignes à la main. Plusieurs : on reste sur la
      // liste, qui les montre toutes.
      if (files.length === 1 && importees[0]) {
        router.push(`/interface/factures/${importees[0]}`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFiles}
        hidden
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        hidden
      />

      <button
        type="button"
        onClick={() => cameraInput.current?.click()}
        disabled={isPending}
        className="flex items-center gap-2 rounded-full px-5 active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{
          minHeight: '46px',
          backgroundColor: 'var(--terracotta)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        <Camera className="h-4 w-4" strokeWidth={2} />
        {isPending ? step || 'Traitement…' : 'Photographier'}
      </button>

      <button
        type="button"
        onClick={() => libraryInput.current?.click()}
        disabled={isPending}
        className="flex items-center gap-2 rounded-full px-4 active:opacity-70 disabled:opacity-50"
        style={{
          minHeight: '46px',
          border: '1px solid var(--espresso-20)',
          color: 'var(--espresso-80)',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        <ImagePlus className="h-4 w-4" strokeWidth={1.9} />
        Fichiers
      </button>
    </div>
  )
}
