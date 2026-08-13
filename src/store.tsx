import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import rawData from "@/data/nsmen.json";
import { enrich, computeRollSummary, type RollSummary } from "@/domain/engine";
import type { EligibilityState, IctWindow, NSman, NSmanSource } from "@/domain/types";
import { ICT_TARGET_STRENGTH, ICT_WINDOW_DEFAULT } from "@/domain/constants";

export type Screen = "dashboard" | "roll" | "drilldown" | "handoff";

/** An eligibility flip caused by the ICT window changing. */
export interface EligibilityChange {
  before: EligibilityState;
  after: EligibilityState;
  beforeRecord: NSman;
}

function addDaysISO(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

interface Store {
  records: NSman[];
  byId: (id: string) => NSman | undefined;
  roll: RollSummary;
  // ICT activity window (v0: single window)
  ictWindow: IctWindow;
  setIctWindow: (w: IctWindow) => void;
  shiftWindow: (days: number) => void;
  resetWindow: () => void;
  /** Eligibility flips from the most recent window change, keyed by NSman id. */
  changes: Map<string, EligibilityChange>;
  // navigation
  screen: Screen;
  go: (s: Screen) => void;
  // drill-down focus
  focusId: string | null;
  openDrilldown: (id: string) => void;
  // selection
  selected: Set<string>;
  toggle: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;
  target: number;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ictWindow, setIctWindowState] = useState<IctWindow>(ICT_WINDOW_DEFAULT);

  const records = useMemo(
    () => (rawData as unknown as NSmanSource[]).map((r) => enrich(r, ictWindow)),
    [ictWindow],
  );
  const roll = useMemo(() => computeRollSummary(records), [records]);
  const index = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);

  // Change tracking: diff the newly-resolved roll against the previous window's
  // roll so any eligibility flip is surfaced, never applied silently.
  const prevRef = useRef<Map<string, NSman> | null>(null);
  const [changes, setChanges] = useState<Map<string, EligibilityChange>>(new Map());
  useEffect(() => {
    const prev = prevRef.current;
    if (prev) {
      const next = new Map<string, EligibilityChange>();
      for (const r of records) {
        const before = prev.get(r.id);
        if (before && before.eligibility.status !== r.eligibility.status) {
          next.set(r.id, {
            before: before.eligibility,
            after: r.eligibility,
            beforeRecord: before,
          });
        }
      }
      setChanges(next);
    }
    prevRef.current = index;
  }, [records, index]);

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const go = useCallback((s: Screen) => {
    setScreen(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  const openDrilldown = useCallback(
    (id: string) => {
      setFocusId(id);
      go("drilldown");
    },
    [go],
  );

  const setIctWindow = useCallback((w: IctWindow) => setIctWindowState(w), []);
  const shiftWindow = useCallback((days: number) => {
    setIctWindowState((w) => ({
      startDate: addDaysISO(w.startDate, days),
      endDate: addDaysISO(w.endDate, days),
    }));
  }, []);
  const resetWindow = useCallback(() => setIctWindowState(ICT_WINDOW_DEFAULT), []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const value: Store = {
    records,
    byId: (id) => index.get(id),
    roll,
    ictWindow,
    setIctWindow,
    shiftWindow,
    resetWindow,
    changes,
    screen,
    go,
    focusId,
    openDrilldown,
    selected,
    toggle,
    selectMany,
    clearSelection,
    target: ICT_TARGET_STRENGTH,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}
