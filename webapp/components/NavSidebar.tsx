"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { MicIcon, DocumentIcon, EditorIcon, BookIcon, SettingsIcon } from "@/components/icons";

const ICONS = { tell: MicIcon, stories: DocumentIcon, editor: EditorIcon, book: BookIcon };

export function NavSidebar({ bookId, displayName }: { bookId: string; displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-border bg-cream-soft px-5 py-6">
      <div className="font-serif text-xl tracking-wide text-ink mb-8 px-1">
        {displayName.toUpperCase()}
      </div>
      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const href = `/${bookId}/${item.segment}`;
          const active = pathname.startsWith(href);
          const Icon = ICONS[item.key];
          return (
            <li key={item.key}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active ? "bg-navy text-cream" : "text-ink-soft hover:bg-card"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 pt-4 border-t border-border">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft">
          <SettingsIcon className="w-4.5 h-4.5" />
          Settings
        </div>
      </div>
    </aside>
  );
}
