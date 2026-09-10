import { redirect } from 'next/navigation'
import { isInterfaceAuthenticated } from '@/lib/interface/auth'
import { InterfaceNav } from '@/components/interface/interface-nav'

/**
 * Ce garde protège l'AFFICHAGE. La vraie barrière est dans chaque server
 * action et chaque lecture (`guardInterface` / `assertInterfaceAuth`) : une
 * server action est un endpoint HTTP public, un layout ne la protège pas.
 */
export default async function InterfaceAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await isInterfaceAuthenticated())) {
    redirect('/interface')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--creme-bg)' }}>
      <InterfaceNav />
      <main className="px-3 py-4 sm:px-5 sm:py-6 mx-auto" style={{ maxWidth: '1100px' }}>
        {children}
      </main>
    </div>
  )
}
