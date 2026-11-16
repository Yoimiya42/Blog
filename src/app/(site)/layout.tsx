import { EntranceProvider } from "@/components/layout/entrance";
import "@/styles/formal.css";

// Formal-host shell. It owns the public tokens and the page transition so
// content components stay independent of the visual system.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="formal">
      <EntranceProvider>{children}</EntranceProvider>
    </div>
  );
}
