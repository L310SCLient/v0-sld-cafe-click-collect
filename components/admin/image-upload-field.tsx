'use client'

import { useRef, useState } from 'react'
import { Camera, X, RefreshCw, Loader2 } from 'lucide-react'
import { uploadImage, deleteImage } from '@/lib/storage'
import { toast } from 'sonner'
import Image from 'next/image'

interface ImageUploadFieldProps {
  value: string | null
  onChange: (url: string | null) => void
  prefix: 'products' | 'formules'
  /** 'square' for products, '16/9' for formules */
  aspect?: 'square' | '16/9'
}

export function ImageUploadField({ value, onChange, prefix, aspect = 'square' }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const result = await uploadImage(file, prefix)
    setUploading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }
    onChange(result.url)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  async function handleDelete() {
    if (!value) return
    const result = await deleteImage(value)
    if (result.error) {
      toast.error(result.error)
    }
    onChange(null)
  }

  const aspectClass = aspect === '16/9' ? 'aspect-video' : 'aspect-square'

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <div
        className={`relative overflow-hidden rounded-xl ${aspectClass}`}
        style={{
          backgroundColor: 'var(--argile)',
          border: '1px dashed var(--espresso-20)',
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
        onClick={() => {
          if (!uploading && !value) inputRef.current?.click()
        }}
      >
        {/* Uploading spinner */}
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--terracotta)' }} />
          </div>
        )}

        {value ? (
          <>
            {/* Image preview */}
            <Image
              src={value}
              alt="Aperçu"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 400px"
            />

            {/* Overlay actions */}
            {!uploading && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    inputRef.current?.click()
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white min-h-[40px]"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white min-h-[40px]"
                  style={{ backgroundColor: 'rgba(185,28,28,0.8)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                >
                  <X className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          !uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Camera className="h-8 w-8" style={{ color: 'var(--espresso-40)' }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--espresso-40)', textAlign: 'center', padding: '0 16px' }}>
                Ajouter une photo (max 5 Mo)
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
