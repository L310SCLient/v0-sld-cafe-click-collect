import { createClient } from '@/lib/supabase/client'

const BUCKET = 'product-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function uuid(): string {
  return crypto.randomUUID()
}

export async function uploadImage(
  file: File,
  prefix: 'products' | 'formules'
): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Le fichier doit être une image (JPG, PNG, WebP…)' }
  }
  if (file.size > MAX_SIZE) {
    return { error: 'L\u2019image ne doit pas dépasser 5 Mo' }
  }

  const supabase = createClient()
  const path = `${prefix}/${uuid()}-${slugify(file.name)}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false })

  if (error) {
    return { error: error.message }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function deleteImage(url: string): Promise<{ error?: string }> {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return { error: 'URL invalide' }

  const path = url.slice(idx + marker.length)
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return { error: error.message }
  return {}
}
