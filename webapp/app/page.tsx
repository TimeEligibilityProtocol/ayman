import { redirect } from "next/navigation";

// Single real tenant for now (Ayman). Once there's a real login this
// becomes a picker/landing page instead of a hard redirect.
export default function RootPage() {
  redirect("/ayman/tell");
}
