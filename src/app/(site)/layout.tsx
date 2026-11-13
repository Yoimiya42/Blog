import "@/styles/formal.css";

// Formal-host shell. It owns the public tokens so content components stay
// independent of the visual system.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <div className="formal">{children}</div>;
}
