'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Product } from '@/types'

export async function toggleProductAvailability(
  productId: string,
  available: boolean
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('products')
    .update({ available })
    .eq('id', productId)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/produits')
  return {}
}

export async function createProduct(data: {
  name: string
  price: number
  category: Product['category']
  image_url?: string
  available: boolean
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Get max display_order
  const { data: existing } = await supabase
    .from('products')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
  const nextOrder = ((existing?.[0] as { display_order: number } | undefined)?.display_order ?? 0) + 1

  const { error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      price: data.price,
      category: data.category,
      image_url: data.image_url || null,
      available: data.available,
      display_order: nextOrder,
    })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/produits')
  return {}
}

export async function updateProduct(
  id: string,
  data: {
    name: string
    price: number
    category: Product['category']
    image_url?: string
    available: boolean
  }
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      price: data.price,
      category: data.category,
      image_url: data.image_url || null,
      available: data.available,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/produits')
  return {}
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/produits')
  return {}
}
