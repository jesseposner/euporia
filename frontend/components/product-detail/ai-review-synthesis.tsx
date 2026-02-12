"use client";

interface AIAnalysis {
  pros?: string[];
  cons?: string[];
  whoIsThisFor?: string;
  features?: { name: string; score: number }[];
}

function scoreBarColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 7) return "bg-yellow-500";
  return "bg-red-500";
}

export function AIReviewSynthesis({ analysis }: { analysis: AIAnalysis }) {
  return (
    <div className="space-y-5">
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          <span className="material-icons-round text-sm">auto_awesome</span>
          Based on AI analysis
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pros Card */}
        {analysis.pros && analysis.pros.length > 0 && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-green-400">
              <span className="material-icons-round text-base">thumb_up</span>
              Pros
            </p>
            <ul className="space-y-2">
              {analysis.pros.map((pro, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="material-icons-round mt-0.5 text-sm text-green-400">
                    check_circle
                  </span>
                  {pro}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons Card */}
        {analysis.cons && analysis.cons.length > 0 && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-red-400">
              <span className="material-icons-round text-base">thumb_down</span>
              Cons
            </p>
            <ul className="space-y-2">
              {analysis.cons.map((con, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="material-icons-round mt-0.5 text-sm text-red-400">
                    cancel
                  </span>
                  {con}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Feature Scores */}
      {analysis.features && analysis.features.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Feature Scores</p>
          <div className="space-y-2">
            {analysis.features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-28 text-xs text-muted-foreground">
                  {f.name}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarColor(f.score)}`}
                    style={{ width: `${(f.score / 10) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium">
                  {f.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Who is this for */}
      {analysis.whoIsThisFor && (
        <div>
          <p className="mb-2 text-sm font-medium">Who is this for?</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {analysis.whoIsThisFor}
          </p>
        </div>
      )}
    </div>
  );
}
