import { PipelineSpans } from "./pipeline-spans";

describe("PipelineSpans", () => {
  it("records stage durations", async () => {
    const spans = new PipelineSpans();
    spans.mark("a");
    await new Promise((r) => setTimeout(r, 5));
    spans.measure("a_ms", "a");
    expect(spans.spans.a_ms).toBeGreaterThanOrEqual(4);
    expect(spans.toJSON().total_ms).toBeGreaterThanOrEqual(4);
  });
});
