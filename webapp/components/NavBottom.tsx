"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { MicIcon, DocumentIcon, EditorIcon, BookIcon } from "@/components/icons";

const ICONS = { tell: MicIcon, stories: DocumentIcon, editor: EditorIcon, book: BookIcon };

export function NavBottom({ bookId }: { bookId: string }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-navy border-t border-border-navy">
      <ul className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const href = `/${bookId}/${item.segment}`;
          const active = pathname.startsWith(href);
          const Icon = ICONS[item.key];
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active ? "text-cream" : "text-cream/55"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className={active ? "font-medium" : ""}>{item.label}</span>
                <span
                  className={`h-0.5 w-8 rounded-full ${active ? "bg-gold" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
