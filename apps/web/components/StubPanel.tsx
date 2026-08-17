export function StubPanel({
  build,
  children,
}: {
  build: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="stub">
      <p className="kicker">Coming in {build}</p>
      <p>{children}</p>
    </aside>
  );
}
