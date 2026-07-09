interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header style={{ marginBottom: "2rem" }}>
      <h1>{title}</h1>
      {description && <p className="meta">{description}</p>}
    </header>
  );
}
