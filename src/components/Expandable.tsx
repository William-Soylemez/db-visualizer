"use client";

import { Children, useState } from "react";

/** Shows the first `initial` children; reveals the rest behind a toggle. */
export default function Expandable({
  children,
  initial = 10,
}: {
  children: React.ReactNode;
  initial?: number;
}) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const shown = open ? items : items.slice(0, initial);
  const hidden = items.length - initial;

  return (
    <div>
      <div>{shown}</div>
      {hidden > 0 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-sm font-medium text-emerald-600 hover:underline"
        >
          {open ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}
