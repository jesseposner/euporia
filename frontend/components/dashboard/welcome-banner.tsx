"use client";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeBanner() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="material-icons-round text-2xl text-yellow-400">
          waving_hand
        </span>
        <div>
          <h2 className="text-xl font-bold">
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Alex
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse products or start a shopping mission with AI Concierge.
          </p>
        </div>
      </div>
    </div>
  );
}
