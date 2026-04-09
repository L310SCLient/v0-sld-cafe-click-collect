import { redirect } from "next/navigation"

export const metadata = {
  title: "Notre Carte | SLD Cafe",
  description: "Decouvrez notre selection de viennoiseries, sandwichs, salades et desserts.",
}

export default function CartePage() {
  redirect("/#catalogue")
}
