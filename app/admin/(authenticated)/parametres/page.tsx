'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ParametresPage() {
  const [slots, setSlots] = useState({
    opening: '11:30',
    closing: '14:00',
    interval: '15',
  })

  const [shop, setShop] = useState({
    name: 'SLD Cafe',
    address: '1 Rue Example, 31000 Toulouse',
    phone: '05 61 00 00 00',
    email: 'contact@sldcafe.fr',
  })

  function handleSaveSlots(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Creneaux de retrait mis a jour')
  }

  function handleSaveShop(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Informations boutique mises a jour')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-serif font-semibold mb-6">Parametres</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Creneaux de retrait</CardTitle>
            <CardDescription>
              Configurez les horaires de retrait des commandes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSlots} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening">Ouverture</Label>
                  <Input
                    id="opening"
                    type="time"
                    value={slots.opening}
                    onChange={(e) => setSlots((s) => ({ ...s, opening: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing">Fermeture</Label>
                  <Input
                    id="closing"
                    type="time"
                    value={slots.closing}
                    onChange={(e) => setSlots((s) => ({ ...s, closing: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalle (min)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={slots.interval}
                    onChange={(e) => setSlots((s) => ({ ...s, interval: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="submit">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations boutique</CardTitle>
            <CardDescription>
              Coordonnees affichees sur le site
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveShop} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shop-name">Nom</Label>
                  <Input
                    id="shop-name"
                    value={shop.name}
                    onChange={(e) => setShop((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-phone">Telephone</Label>
                  <Input
                    id="shop-phone"
                    type="tel"
                    value={shop.phone}
                    onChange={(e) => setShop((s) => ({ ...s, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="shop-address">Adresse</Label>
                  <Input
                    id="shop-address"
                    value={shop.address}
                    onChange={(e) => setShop((s) => ({ ...s, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="shop-email">Email</Label>
                  <Input
                    id="shop-email"
                    type="email"
                    value={shop.email}
                    onChange={(e) => setShop((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="submit">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
