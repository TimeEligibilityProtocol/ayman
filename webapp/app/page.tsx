import { redirect } from "next/navigation";

// The bare domain used to hard-redirect into Ayman's personal book,
// meaning anyone shown the plain link landed inside his private content.
// It now points to a real, working, but neutral "demo" panel instead —
// fully functional (record, browse, etc.) but its displayName ("Preview")
// is never any specific person's name.
export default function RootPage() {
  redirect("/demo/tell");
}
