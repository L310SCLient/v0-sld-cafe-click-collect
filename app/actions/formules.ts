'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { FormuleEtape } from '@/types'

export async function getFormules() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('formules')
    .select('*, etapes:formule_etapes(*)')
    .order('display_order')
  if (error) return { error: error.message }
  // Sort etapes by display_order
  const formules = (data ?? []).map((f: any) => ({
    ...f,
    etapes: (f.etapes ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
  }))
  return { formules }
}

export async function createFormule(data: {
  name: string
  tagline: string
  price: number // cents
  image_url?: string
  is_active: boolean
  etapes: { label: string; category: string; choix_count: number }[]
}) {
  const supabase = createAdminClient()

  // Get max display_order
  const { data: existing } = await supabase
    .from('formules')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.display_order ?? 0) + 1

  const { data: formule, error } = await supabase
    .from('formules')
    .insert({
      name: data.name,
      tagline: data.tagline,
      price: data.price,
      image_url: data.image_url || null,
      is_active: data.is_active,
      display_order: nextOrder,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Insert etapes
  if (data.etapes.length > 0) {
    const etapesData = data.etapes.map((e, i) => ({
      formule_id: formule.id,
      label: e.label,
      category: e.category,
      choix_count: e.choix_count,
      display_order: i + 1,
    }))
    const { error: etError } = await supabase
      .from('formule_etapes')
      .insert(etapesData)
    if (etError) return { error: etError.message }
  }

  revalidatePath('/admin/formules')
  revalidatePath('/')
  return { id: formule.id }
}

export async function updateFormule(
  id: string,
  data: {
    name: string
    tagline: string
    price: number
    image_url?: string
    is_active: boolean
    etapes: { id?: string; label: string; category: string; choix_count: number }[]
  }
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('formules')
    .update({
      name: data.name,
      tagline: data.tagline,
      price: data.price,
      image_url: data.image_url || null,
      is_active: data.is_active,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Replace all etapes: delete existing, insert new
  await supabase.from('formule_etapes').delete().eq('formule_id', id)

  if (data.etapes.length > 0) {
    const etapesData = data.etapes.map((e, i) => ({
      formule_id: id,
      label: e.label,
      category: e.category,
      choix_count: e.choix_count,
      display_order: i + 1,
    }))
    const { error: etError } = await supabase
      .from('formule_etapes')
      .insert(etapesData)
    if (etError) return { error: etError.message }
  }

  revalidatePath('/admin/formules')
  revalidatePath('/')
  return {}
}

export async function deleteFormule(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('formules').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/formules')
  revalidatePath('/')
  return {}
}

export async function toggleFormuleActive(id: string, is_active: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('formules')
    .update({ is_active })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/formules')
  revalidatePath('/')
  return {}
}
