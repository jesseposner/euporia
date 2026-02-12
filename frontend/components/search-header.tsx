"use client";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface SearchHeaderProps {
  title: string;
  showGreeting?: boolean;
}

export function SearchHeader({ title, showGreeting }: SearchHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/90 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        {showGreeting && (
          <span className="hidden text-sm text-muted-foreground md:inline">
            {getGreeting()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent">
          <span className="material-icons-round text-xl">notifications_none</span>
        </button>
      </div>
    </header>
  );
}
