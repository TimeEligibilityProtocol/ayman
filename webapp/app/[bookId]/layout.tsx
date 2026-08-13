import { getBookBySlug } from "@/lib/getBook";
import { NavBottom } from "@/components/NavBottom";
import { NavSidebar } from "@/components/NavSidebar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SettingsIcon } from "@/components/icons";

export default async function BookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);

  return (
    <div className="flex flex-1 min-h-0">
      <NavSidebar bookId={book.slug} displayName={book.displayName} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header
          className="md:hidden flex items-center justify-between px-5 pb-2 shrink-0"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          <span className="font-serif text-lg tracking-wide">{book.displayName.toUpperCase()}</span>
          <SettingsIcon className="w-5 h-5 text-ink-soft" />
        </header>

        <InstallPrompt />

        <main className="flex-1 min-h-0 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        <NavBottom bookId={book.slug} />
      </div>
    </div>
  );
}
