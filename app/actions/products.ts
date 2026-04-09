'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleProductAvailability(
  productId: string,
  available: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ available })
    .eq('id', productId)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/produits')
  return {}
}
