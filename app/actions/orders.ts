'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OrderItem } from '@/types'

export async function createOrder(data: {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  items: OrderItem[]
  totalCents: number
  pickupTime: string
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_first_name: data.firstName,
      customer_last_name: data.lastName,
      customer_email: data.email || null,
      customer_phone: data.phone || null,
      items: data.items,
      total_cents: data.totalCents,
      pickup_time: data.pickupTime,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/commandes')
  return { id: order.id }
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'confirmed' | 'ready' | 'picked_up'
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) return { error: error.message }

  revalidatePath('/admin/commandes')
  revalidatePath(`/suivi/${orderId}`)
  return {}
}
