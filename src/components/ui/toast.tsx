"use client";

import { cn } from "@/lib/utils";
import { Toast as BaseToast } from "@base-ui-components/react/toast";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

// Singleton manager — import `toast` and call toast.add(), toast.promise(), etc.
export const toast = BaseToast.createToastManager();

const typeIcons: Record<string, ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-danger" />,
  info: <Info className="h-4 w-4 text-info" />,
};

function ToastViewportInner() {
  const { toasts } = BaseToast.useToastManager();
  return (
    <BaseToast.Viewport
      className={cn(
        "fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col-reverse gap-2",
        "sm:bottom-4 sm:right-4",
      )}
    >
      {toasts.map((t) => (
        <BaseToast.Root
          key={t.id}
          toast={t}
          className={cn(
            "relative flex w-full items-start gap-3 overflow-hidden rounded-lg border border-border",
            "bg-surface-elevated p-4 shadow-lg",
            "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
            "data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0",
            "transition-all duration-200",
          )}
        >
          {t.type && typeIcons[t.type] && (
            <div className="mt-0.5 shrink-0">{typeIcons[t.type]}</div>
          )}
          <div className="flex flex-1 flex-col gap-0.5">
            {t.title && <BaseToast.Title className="text-sm font-semibold text-fg" />}
            {t.description && <BaseToast.Description className="text-sm text-fg-muted" />}
          </div>
          <BaseToast.Close
            className={cn(
              "mt-0.5 shrink-0 rounded-sm text-fg-muted opacity-70 transition-opacity",
              "hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </BaseToast.Close>
        </BaseToast.Root>
      ))}
    </BaseToast.Viewport>
  );
}

export function ToastProvider({
  children,
  timeout = 5000,
}: {
  children: ReactNode;
  timeout?: number;
}) {
  return (
    <BaseToast.Provider toastManager={toast} timeout={timeout}>
      {children}
      <ToastViewportInner />
    </BaseToast.Provider>
  );
}
