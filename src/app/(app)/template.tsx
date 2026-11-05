/** Re-mounts on every navigation, so each page fades in gently (no transform is kept afterwards). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up motion-reduce:animate-none">{children}</div>;
}
