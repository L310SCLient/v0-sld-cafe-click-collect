import { ProductCatalog } from "@/components/product-catalog"
import { CartSidebar } from "@/components/cart-sidebar"
import { CategoryNav } from "@/components/category-nav"

export const metadata = {
  title: "Notre Carte | SLD Cafe",
  description: "Decouvrez notre selection de viennoiseries, sandwichs, salades et desserts. Commandez en ligne et recuperez au comptoir.",
}

export default function CartePage() {
  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Page Header */}
        <section className="bg-secondary/30 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="max-w-2xl">
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight">
                Notre Carte
              </h1>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Selectionnez vos produits et recuperez votre commande au comptoir. 
                Click &amp; Collect disponible du lundi au samedi.
              </p>
            </div>
          </div>
        </section>

        {/* Category Navigation */}
        <CategoryNav />

        {/* Product Catalog */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          <ProductCatalog />
        </section>
      </div>

      <CartSidebar />
    </>
  )
}
