"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  fallbackBackUrl?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showBack?: boolean;
}

export function PageHeader({
  title,
  description,
  fallbackBackUrl = "/",
  breadcrumbs,
  actions,
  showBack = true,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
    } else {
      router.push(fallbackBackUrl);
    }
  };

  const hasTopRow = showBack || (breadcrumbs && breadcrumbs.length > 0);

  return (
    <div className="mb-6 pb-5 border-b border-surface-border">
      {/* Breadcrumbs and Back Button */}
      {hasTopRow && (
        <div className="flex items-center gap-3 mb-2.5 text-xs text-charcoal-500">
          {showBack && (
            <button
              onClick={handleBack}
              type="button"
              className="inline-flex items-center gap-1 font-medium text-charcoal-600 hover:text-charcoal-900 px-2 py-1 rounded bg-surface-warm hover:bg-surface-muted transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 overflow-x-auto">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5 flex-shrink-0">
                <ChevronRight className="w-3 h-3 text-charcoal-400" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-charcoal-900 transition-colors font-medium text-charcoal-600"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-charcoal-900 font-semibold">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}
        </div>
      )}

      {/* Main Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-xs text-charcoal-600 max-w-3xl leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
