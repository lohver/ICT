import { AppShell } from "@/components/AppShell";
import { useStore } from "@/store";
import { Dashboard } from "@/screens/Dashboard";
import { Roll } from "@/screens/Roll";
import { Drilldown } from "@/screens/Drilldown";
import { Handoff } from "@/screens/Handoff";

export function App() {
  const { screen } = useStore();
  return (
    <AppShell>
      {screen === "dashboard" && <Dashboard />}
      {screen === "roll" && <Roll />}
      {screen === "drilldown" && <Drilldown />}
      {screen === "handoff" && <Handoff />}
    </AppShell>
  );
}
