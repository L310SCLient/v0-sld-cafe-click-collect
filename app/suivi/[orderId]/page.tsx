import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { OrderTracking } from "@/components/order-tracking"
import type { Order } from "@/types"

interface SuiviPageProps {
  params: Promise<{ orderId: string }>
}

export default async function SuiviPage({ params }: SuiviPageProps) {
  const { orderId } = await params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single()

  if (error || !order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <OrderTracking order={order as Order} />
      </div>
    </div>
  )
}
