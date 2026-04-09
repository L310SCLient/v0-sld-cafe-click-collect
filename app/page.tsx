"use client"

import Link from "next/link"
import { ArrowRight, Clock, MapPin, Leaf, Heart, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

const values = [
  {
    icon: Leaf,
    title: "Produits Frais",
    description: "Tous nos produits sont prepares chaque jour avec des ingredients de saison.",
  },
  {
    icon: Heart,
    title: "Fait Maison",
    description: "Sandwichs, salades et patisseries elabores dans notre cuisine.",
  },
  {
    icon: Users,
    title: "Convivialite",
    description: "Un lieu chaleureux ou se retrouver entre amis ou collegues.",
  },
]

const featuredCategories = [
  { name: "Viennoiseries", description: "Croissants, pains au chocolat et brioches", image: "/placeholder-viennoiserie.jpg" },
  { name: "Sandwichs", description: "Compositions maison sur pain frais", image: "/placeholder-sandwich.jpg" },
  { name: "Salades", description: "Fraicheur et saveurs de saison", image: "/placeholder-salade.jpg" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-background to-secondary/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <p className="text-accent font-medium tracking-wide uppercase text-sm mb-4">
              Bienvenue au
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-tight text-balance">
              SLD Cafe
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Au coeur de Toulouse, decouvrez notre selection de viennoiseries fraiches, 
              sandwichs gourmands et salades de saison. Un moment de pause, un instant de plaisir.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/carte">
                  Decouvrir notre carte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">
                  Nous trouver
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Info Banner */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>12 Rue de la Pomme, Toulouse</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Lun - Ven : 7h30 - 19h00 | Sam : 8h00 - 18h00</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground">
              Notre Engagement
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Depuis notre ouverture, nous mettons un point d&apos;honneur a vous offrir le meilleur.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-secondary mb-6">
                  <value.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground">
                Notre Carte
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-xl">
                Des produits frais prepares chaque jour pour satisfaire toutes vos envies.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-6 md:mt-0">
              <Link href="/carte">
                Voir tout le menu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredCategories.map((category) => (
              <Link
                key={category.name}
                href="/carte"
                className="group relative bg-card rounded-xl overflow-hidden border border-border hover:border-accent/50 transition-all duration-300"
              >
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-6">
                  <h3 className="font-serif text-xl font-semibold text-foreground group-hover:text-accent transition-colors">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Click & Collect CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-2xl p-8 md:p-12 lg:p-16 text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-primary-foreground">
              Commandez en Click &amp; Collect
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              Selectionnez vos produits, choisissez votre creneau de retrait, 
              et recuperez votre commande directement au comptoir. Simple et rapide.
            </p>
            <Button asChild size="lg" className="mt-8 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/carte">
                Commander maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/50 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="font-serif text-2xl font-semibold text-foreground">
                SLD Cafe
              </span>
              <p className="mt-4 text-muted-foreground max-w-sm">
                Votre pause gourmande au coeur de Toulouse. 
                Viennoiseries, sandwichs et salades prepares avec passion.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-4">Navigation</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-accent transition-colors">Accueil</Link></li>
                <li><Link href="/carte" className="hover:text-accent transition-colors">Notre Carte</Link></li>
                <li><Link href="/histoire" className="hover:text-accent transition-colors">Notre Histoire</Link></li>
                <li><Link href="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-4">Horaires</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Lun - Ven : 7h30 - 19h00</li>
                <li>Samedi : 8h00 - 18h00</li>
                <li>Dimanche : Ferme</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SLD Cafe. Tous droits reserves.
          </div>
        </div>
      </footer>
    </div>
  )
}
