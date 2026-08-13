"use client";

import { cn } from "@/lib/utils";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { Search } from "lucide-react";
import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ItemEntry {
  id: string;
  value: string;
  keywords: string[];
  onSelect?: () => void;
}

interface CommandContextValue {
  query: string;
  setQuery: (q: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  register: (entry: ItemEntry) => () => void;
  registerElement: (id: string, el: HTMLElement | null) => void;
  matches: (entry: ItemEntry) => boolean;
  visibleIds: () => string[];
  selectActive: () => void;
  moveActive: (delta: 1 | -1 | "first" | "last") => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

function useCommand() {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error("Command parts must be rendered inside <Command>");
  return ctx;
}

/**
 * Public hook for reading state from a parent that renders inside <Command>.
 * Useful when a wrapping component (e.g. a footer or a custom result renderer)
 * needs the current query, the active item, or the count of matching items.
 */
export function useCommandState() {
  const { query, activeId, visibleIds } = useCommand();
  return { query, activeId, visibleIds };
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

export function Command({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const itemsRef = useRef<Map<string, ItemEntry>>(new Map());
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());

  const register = useCallback((entry: ItemEntry) => {
    itemsRef.current.set(entry.id, entry);
    return () => {
      itemsRef.current.delete(entry.id);
    };
  }, []);

  const registerElement = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(id, el);
    else elementsRef.current.delete(id);
  }, []);

  const matches = useCallback(
    (entry: ItemEntry) => {
      const q = normalize(query);
      if (!q) return true;
      if (normalize(entry.value).includes(q)) return true;
      return entry.keywords.some((k) => normalize(k).includes(q));
    },
    [query],
  );

  /**
   * Returns ids of items that pass the current filter, sorted by their
   * current DOM position. Using compareDocumentPosition keeps keyboard nav
   * correct even when the parent re-sorts the rendered list.
   */
  const visibleIds = useCallback(() => {
    const visible: { id: string; el: HTMLElement | undefined }[] = [];
    for (const [id, entry] of itemsRef.current) {
      if (matches(entry)) visible.push({ id, el: elementsRef.current.get(id) });
    }
    visible.sort((a, b) => {
      if (!a.el || !b.el) return 0;
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    return visible.map((v) => v.id);
  }, [matches]);

  // Keep activeId valid: prefer current if still visible, else first visible.
  useEffect(() => {
    const visible = visibleIds();
    if (visible.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId((current) => (current && visible.includes(current) ? current : visible[0]));
  }, [query, visibleIds]);

  // Scroll the active item into view (helps keyboard navigation on long lists).
  useEffect(() => {
    if (!activeId) return;
    const el = elementsRef.current.get(activeId);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const moveActive = useCallback(
    (delta: 1 | -1 | "first" | "last") => {
      const visible = visibleIds();
      if (visible.length === 0) return;
      if (delta === "first") {
        setActiveId(visible[0]);
        return;
      }
      if (delta === "last") {
        setActiveId(visible[visible.length - 1]);
        return;
      }
      setActiveId((current) => {
        const idx = current ? visible.indexOf(current) : -1;
        if (idx === -1) return delta === 1 ? visible[0] : visible[visible.length - 1];
        const next = (idx + delta + visible.length) % visible.length;
        return visible[next];
      });
    },
    [visibleIds],
  );

  const selectActive = useCallback(() => {
    if (!activeId) return;
    const entry = itemsRef.current.get(activeId);
    entry?.onSelect?.();
  }, [activeId]);

  const ctx = useMemo<CommandContextValue>(
    () => ({
      query,
      setQuery,
      activeId,
      setActiveId,
      register,
      registerElement,
      matches,
      visibleIds,
      selectActive,
      moveActive,
    }),
    [query, activeId, register, registerElement, matches, visibleIds, selectActive, moveActive],
  );

  return (
    <CommandContext.Provider value={ctx}>
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-md bg-surface-elevated text-fg",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export function CommandDialog({
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof BaseDialog.Root>, "children"> & { children?: ReactNode }) {
  return (
    <BaseDialog.Root {...props}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-bg/60 backdrop-blur-sm",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "transition-opacity duration-200",
          )}
        />
        <BaseDialog.Popup
          className={cn(
            "fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2",
            "overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-lg",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            "transition-all duration-200",
          )}
        >
          <Command>{children}</Command>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export function CommandInput({
  className,
  onValueChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  onValueChange?: (v: string) => void;
}) {
  const { query, setQuery, moveActive, selectActive } = useCommand();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onValueChange?.(e.target.value);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveActive("first");
    } else if (e.key === "End") {
      e.preventDefault();
      moveActive("last");
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectActive();
    }
  };

  return (
    <div className="flex items-center border-b border-border px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 text-fg-muted" />
      <input
        className={cn(
          "flex h-11 w-full bg-transparent py-3 text-sm text-fg outline-none",
          "placeholder:text-fg-muted disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        value={props.value ?? query}
        onChange={handleChange}
        onKeyDown={handleKey}
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("max-h-80 overflow-y-auto overflow-x-hidden", className)}
      role="listbox"
      {...props}
    />
  );
}

export function CommandEmpty({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { visibleIds } = useCommand();
  if (visibleIds().length > 0) return null;
  return (
    <div className={cn("py-6 text-center text-sm text-fg-muted", className)} {...props}>
      {children ?? "No results found."}
    </div>
  );
}

export function CommandGroup({
  className,
  heading,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { heading?: ReactNode }) {
  // Hide the group entirely when all its children are filtered out.
  const ref = useRef<HTMLDivElement>(null);
  const [hasVisible, setHasVisible] = useState(true);
  const { query } = useCommand();

  useEffect(() => {
    if (!ref.current) return;
    const items = ref.current.querySelectorAll('[role="option"]');
    let any = false;
    items.forEach((el) => {
      if ((el as HTMLElement).dataset.hidden !== "true") any = true;
    });
    setHasVisible(any || items.length === 0);
  }, [query]);

  // Stay mounted and hide via `hidden` rather than returning null — otherwise the
  // ref detaches when the group empties, the effect above bails on `!ref.current`,
  // and clearing the query can never restore the group.
  return (
    <div
      ref={ref}
      className={cn("overflow-hidden p-1 text-fg", !hasVisible && "hidden", className)}
      role="group"
      {...props}
    >
      {heading && <div className="px-2 py-1.5 text-xs font-semibold text-fg-muted">{heading}</div>}
      {children}
    </div>
  );
}

function getTextValue(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getTextValue).join(" ");
  if (children && typeof children === "object" && "props" in children) {
    return getTextValue((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

export interface CommandItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  value?: string;
  keywords?: string[];
  onSelect?: () => void;
  disabled?: boolean;
}

export function CommandItem({
  className,
  children,
  value,
  keywords,
  onSelect,
  disabled,
  ...props
}: CommandItemProps) {
  const { register, registerElement, matches, activeId, setActiveId } = useCommand();
  const id = useId();
  const elRef = useRef<HTMLDivElement>(null);
  const resolvedValue = value ?? getTextValue(children);
  const keywordsKey = (keywords ?? []).join("");

  // Stable ref to the latest onSelect so registration doesn't churn.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    return register({
      id,
      value: resolvedValue,
      keywords: keywords ?? [],
      onSelect: () => onSelectRef.current?.(),
    });
    // keywordsKey covers content changes inside the keywords array without
    // requiring a stable reference from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, resolvedValue, keywordsKey, register]);

  useLayoutEffect(() => {
    registerElement(id, elRef.current);
    return () => registerElement(id, null);
  }, [id, registerElement]);

  const entry: ItemEntry = { id, value: resolvedValue, keywords: keywords ?? [] };
  const visible = matches(entry);
  const isActive = activeId === id;

  return (
    <div
      ref={elRef}
      role="option"
      aria-selected={isActive}
      data-hidden={visible ? undefined : "true"}
      onMouseEnter={() => !disabled && setActiveId(id)}
      onClick={() => !disabled && onSelect?.()}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg outline-none",
        "aria-selected:bg-bg-muted",
        disabled && "pointer-events-none opacity-50",
        !visible && "hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommandSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 h-px bg-border", className)} {...props} />;
}

export function CommandShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ml-auto text-xs tracking-widest text-fg-subtle", className)} {...props} />
  );
}
