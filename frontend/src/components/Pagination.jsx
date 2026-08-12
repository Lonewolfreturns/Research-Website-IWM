import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared pager for the long index pages. Renders nothing at all when there is
 * only one page, so a page can adopt it before it has enough content to need it.
 */
export default function Pagination({ page, totalPages, onChange, testIdPrefix = "pagination", label = "Pages" }) {
  if (totalPages <= 1) return null;
  const btn =
    "border hairline px-3 py-2 text-[11px] font-mono tracking-widest uppercase transition-colors disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center gap-2 hover:enabled:bg-[#1C2722] hover:enabled:text-[#F9F8F6]";

  return (
    <nav
      className="mt-12 pt-8 border-t hairline flex flex-wrap items-center justify-between gap-4"
      aria-label={label}
      data-testid={`${testIdPrefix}-pagination`}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        data-testid={`${testIdPrefix}-prev`}
      >
        <ChevronLeft size={12} /> Previous
      </button>

      <div className="flex items-center gap-1.5" role="group">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            className={`w-9 h-9 border hairline text-[11px] font-mono transition-colors ${
              n === page ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722] hover:bg-[#F2EFEA]"
            }`}
            data-testid={`${testIdPrefix}-page-${n}`}
          >
            {String(n).padStart(2, "0")}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={btn}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        data-testid={`${testIdPrefix}-next`}
      >
        Next <ChevronRight size={12} />
      </button>
    </nav>
  );
}
