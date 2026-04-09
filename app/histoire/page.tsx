import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Notre histoire | SLD Cafe",
  description: "Decouvrez l'histoire de SLD Cafe, votre sandwicherie artisanale a Toulouse.",
}

export default function HistoirePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-secondary/60 via-background to-secondary/40 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground text-center text-balance">
            Notre histoire
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
            Une passion pour les saveurs authentiques, transmise avec amour depuis Toulouse.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="prose prose-lg max-w-none">
          {/* Origin Story */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Les debuts
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Tout a commence en 2015, dans une petite rue du centre de Toulouse. Sophie, Laurent et David,
              trois amis passionnes de gastronomie, ont decide de creer un lieu ou la qualite et la
              convivialite seraient les maitres mots. Le SLD Cafe etait ne.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Des les premiers jours, notre philosophie etait simple : proposer des produits frais,
              prepares sur place chaque matin, avec des ingredients soigneusement selectionnes aupres
              de producteurs locaux.
            </p>
          </div>

          {/* Values */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Nos valeurs
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-medium text-foreground mb-2">Fraicheur</h3>
                <p className="text-sm text-muted-foreground">
                  Nos viennoiseries sont preparees chaque matin a partir de 5h.
                  Rien n&apos;est rechauff, tout est frais.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-medium text-foreground mb-2">Qualite</h3>
                <p className="text-sm text-muted-foreground">
                  Nous privilegions les circuits courts et les produits de saison
                  pour garantir le meilleur gout.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-medium text-foreground mb-2">Convivialite</h3>
                <p className="text-sm text-muted-foreground">
                  Le SLD Cafe, c&apos;est avant tout un lieu de vie, de rencontres
                  et de partage autour de bonnes choses.
                </p>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              L&apos;equipe
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Aujourd&apos;hui, notre equipe compte une dizaine de personnes passionnees qui partagent
              les memes valeurs. Des boulangers arrives a l&apos;aube aux serveurs qui vous accueillent
              avec le sourire, chacun contribue a faire du SLD Cafe un endroit unique.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Nous sommes fiers de servir chaque jour des centaines de Toulousains et de visiteurs,
              et nous avons hate de vous accueillir pour partager un moment gourmand.
            </p>
          </div>

          {/* Quote */}
          <div className="bg-secondary/50 rounded-xl p-8 text-center">
            <blockquote className="font-serif text-xl text-foreground italic">
              &quot;Le bon pain, c&apos;est la base de tout repas. Nous mettons tout notre c&oelig;ur
              a vous offrir cette base, chaque jour.&quot;
            </blockquote>
            <p className="mt-4 text-sm text-muted-foreground">
              &mdash; Sophie, Laurent & David, fondateurs
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
