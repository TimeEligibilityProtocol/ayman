"use client";

import { useRouter } from "next/navigation";
import { EditableText } from "@/components/EditableText";

export function RemoteEditableText({
  endpoint,
  field,
  value,
  multiline = false,
  as = "p",
  className = "",
  placeholder,
}: {
  endpoint: string;
  field: string;
  value: string;
  multiline?: boolean;
  as?: "p" | "h1" | "h2" | "span" | "div";
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();

  async function onSave(newValue: string) {
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue }),
    });
    if (!res.ok) throw new Error("Save failed");
    router.refresh();
  }

  return (
    <EditableText
      value={value}
      onSave={onSave}
      multiline={multiline}
      as={as}
      className={className}
      placeholder={placeholder}
    />
  );
}
