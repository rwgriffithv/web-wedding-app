interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="mb-8">
      <h1>{title}</h1>
      {description && <p className="meta">{description}</p>}
    </header>
  );
}
