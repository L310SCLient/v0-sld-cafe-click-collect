import { redirect } from 'next/navigation'
import { isInterfaceAuthenticated } from '@/lib/interface/auth'
import { PinPad } from '@/components/interface/pin-pad'

export const metadata = {
  title: 'Cuisine — SLD Café',
}

export default async function InterfaceEntryPage() {
  if (await isInterfaceAuthenticated()) {
    redirect('/interface/ingredients')
  }
  return <PinPad />
}
