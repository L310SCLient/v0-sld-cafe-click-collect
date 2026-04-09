import { ProductCatalog } from "@/components/product-catalog"
import { CartSidebar } from "@/components/cart-sidebar"
import { CategoryNav } from "@/components/category-nav"

export default function HomePage() {
  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-secondary/30 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="max-w-2xl">
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight text-balance">
                Commandez en ligne, recuperez au comptoir
              </h1>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Viennoiseries fraiches, sandwichs maison et salades composees. 
                Choisissez votre creneau et passez nous voir au SLD Cafe.
              </p>
            </div>
          </div>
        </section>

        {/* Category Navigation */}
        <CategoryNav />

        {/* Product Catalog */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProductCatalog />
        </section>
      </div>

      <CartSidebar />
    </>
  )
}
