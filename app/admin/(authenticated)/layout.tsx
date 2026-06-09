import { redirect } from 'next/navigation'
import { checkAdminAuth } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuth = await checkAdminAuth()
  if (!isAuth) {
    redirect('/admin/login')
  }

  const supabase = await createClient()
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--creme-bg)' }}
    >
      <AdminNav pendingCount={count ?? 0} />

      {/* Main content — sidebar offset on desktop, top bar offset on mobile/tablet */}
      <main className="lg:pl-60 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-9">
          {children}
        </div>
      </main>
    </div>
  )
}
