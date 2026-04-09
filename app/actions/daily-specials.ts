'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setDailySpecial(
  date: string,
  productId: string,
  visibleFrom: string = '10:00'
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('daily_specials')
    .upsert(
      { date, product_id: productId, visible_from: visibleFrom },
      { onConflict: 'date' }
    )

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
