import { redirect } from "next/navigation";

// force-dynamic: this route has no data fetching, so Next.js was treating
// it as a static page and letting it be cached for a full year at the
// edge (Cloudflare). That meant every future change to where "/" points
// kept serving whatever redirect target was cached at the time — never
// re-checked. Never cache a redirect target that can change.
export const dynamic = "force-dynamic";

// The bare domain used to hard-redirect into Ayman's personal book,
// meaning anyone shown the plain link landed inside his private content.
// It now points to a real, working, but neutral "demo" panel instead —
// fully functional (record, browse, etc.) but its displayName ("Preview")
// is never any specific person's name.
export default function RootPage() {
  redirect("/demo/tell");
}
