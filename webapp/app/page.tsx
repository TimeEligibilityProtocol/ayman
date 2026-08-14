// Neutral landing screen — no panel's name or data. The root domain used
// to hard-redirect straight into Ayman's personal book, which meant
// anyone shown the bare link landed inside his private content. Now it's
// just the app itself; each person's own link (e.g. /ola, /soulaf) is
// where their actual book lives.
export default function RootPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center px-6 py-16">
      <h1 className="font-serif text-3xl md:text-4xl text-ink mb-3">Tell your story.</h1>
      <h1 className="font-serif text-3xl md:text-4xl text-ink mb-6">Let it become a book.</h1>
      <p className="text-ink-soft max-w-sm">
        Record memories, talk to your Editor, and shape your book — one story at a time.
      </p>
    </div>
  );
}
