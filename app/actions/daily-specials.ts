'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setDailySpecial(
  date: string,
  productId: string | null,
  visibleFrom: string = '10:00',
  customName?: string | null,
  customPrice?: number | null,
  customImageUrl?: string | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const hasCustom = Boolean(customName && customPrice != null)
  if (!productId && !hasCustom) {
    return { error: 'Produit ou plat personnalise requis' }
  }

  const row = {
    date,
    visible_from: visibleFrom,
    product_id: hasCustom ? null : productId,
    custom_name: hasCustom ? customName : null,
    custom_price: hasCustom ? customPrice : null,
    custom_image_url: hasCustom ? (customImageUrl ?? null) : null,
  }

  const { error } = await supabase
    .from('daily_specials')
    .upsert(row, { onConflict: 'date' })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/plat-du-jour')
  return {}
}

export async function clearDailySpecial(date: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('daily_specials')
    .delete()
    .eq('date', date)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/plat-du-jour')
  return {}
}
