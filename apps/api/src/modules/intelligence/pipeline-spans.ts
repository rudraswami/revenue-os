/** Per-turn timing spans stored on ai_runs.input.spans for latency observability. */
export class PipelineSpans {
  private readonly origin = Date.now();
  private readonly marks = new Map<string, number>();
  readonly spans: Record<string, number> = {};

  constructor() {
    this.marks.set("start", this.origin);
  }

  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /** Record duration in ms from `from` mark to now (or `to` mark). */
  measure(name: string, from: string, to?: string): void {
    const start = this.marks.get(from);
    if (start == null) return;
    const end = to ? (this.marks.get(to) ?? Date.now()) : Date.now();
    this.spans[name] = Math.max(0, end - start);
  }

  sinceStart(): number {
    return Date.now() - this.origin;
  }

  toJSON(): Record<string, number> {
    return { ...this.spans, total_ms: this.sinceStart() };
  }
}
