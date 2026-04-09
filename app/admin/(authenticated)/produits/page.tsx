'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleProductAvailability } from '@/app/actions/products'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

const CATEGORIES: { key: Product['category']; label: string }[] = [
  { key: 'viennoiseries', label: 'Viennoiseries' },
  { key: 'sandwichs', label: 'Sandwichs' },
  { key: 'salades', label: 'Salades' },
  { key: 'chaud', label: 'Plats chauds' },
  { key: 'desserts', label: 'Desserts' },
]

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true })
      setProducts((data as Product[]) ?? [])
      setLoading(false)
    }
    fetchProducts()
  }, [])

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold mb-6">Produits</h1>

      <Tabs defaultValue="all">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="all">Tous</TabsTrigger>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <ProductTable
            products={products}
            onToggle={(id, val) =>
              setProducts((prev) =>
                prev.map((p) => (p.id === id ? { ...p, available: val } : p))
              )
            }
          />
        </TabsContent>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.key} value={cat.key}>
            <ProductTable
              products={products.filter((p) => p.category === cat.key)}
              onToggle={(id, val) =>
                setProducts((prev) =>
                  prev.map((p) => (p.id === id ? { ...p, available: val } : p))
                )
              }
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function ProductTable({
  products,
  onToggle,
}: {
  products: Product[]
  onToggle: (id: string, available: boolean) => void
}) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Prix</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Categorie</th>
              <th className="text-right px-4 py-3 font-medium">Disponible</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onToggle={onToggle}
              />
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun produit
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductRow({
  product,
  onToggle,
}: {
  product: Product
  onToggle: (id: string, available: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  async function handleToggle(checked: boolean) {
    onToggle(product.id, checked)

    startTransition(async () => {
      const result = await toggleProductAvailability(product.id, checked)
      if (result.error) {
        onToggle(product.id, !checked)
        toast.error(result.error)
      }
    })
  }

  const categoryLabel = CATEGORIES.find((c) => c.key === product.category)?.label ?? product.category

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium">{product.name}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatPrice(product.price)}</td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Switch
          checked={product.available}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </td>
    </tr>
  )
}
