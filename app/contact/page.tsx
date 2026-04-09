import type { Metadata } from "next"
import { ContactForm } from "@/components/contact-form"
import { MapPin, Clock, Phone, Mail } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact | SLD Cafe",
  description: "Contactez le SLD Cafe a Toulouse. Adresse, horaires d'ouverture et formulaire de contact.",
}

const hours = [
  { day: "Lundi", hours: "7h30 - 19h00" },
  { day: "Mardi", hours: "7h30 - 19h00" },
  { day: "Mercredi", hours: "7h30 - 19h00" },
  { day: "Jeudi", hours: "7h30 - 19h00" },
  { day: "Vendredi", hours: "7h30 - 19h00" },
  { day: "Samedi", hours: "8h00 - 18h00" },
  { day: "Dimanche", hours: "Ferme" },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-secondary/30 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground text-center text-balance">
            Contactez-nous
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
            Une question, une suggestion ou simplement envie de nous dire bonjour ? 
            Nous sommes a votre ecoute.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Info */}
          <div className="space-y-8">
            {/* Address */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-secondary">
                  <MapPin className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Adresse</h3>
                  <p className="text-muted-foreground">
                    12 Rue des Artisans<br />
                    31000 Toulouse<br />
                    France
                  </p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-secondary">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground mb-3">Horaires d&apos;ouverture</h3>
                  <div className="space-y-2">
                    {hours.map((item) => (
                      <div key={item.day} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.day}</span>
                        <span className={item.hours === "Ferme" ? "text-destructive" : "text-foreground"}>
                          {item.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-card rounded-xl p-6 border border-border space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary">
                  <Phone className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Telephone</h3>
                  <a href="tel:+33561234567" className="text-muted-foreground hover:text-accent transition-colors">
                    05 61 23 45 67
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary">
                  <Mail className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Email</h3>
                  <a href="mailto:contact@sldcafe.fr" className="text-muted-foreground hover:text-accent transition-colors">
                    contact@sldcafe.fr
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-xl p-6 md:p-8 border border-border h-fit">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-6">
              Envoyez-nous un message
            </h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  )
}
