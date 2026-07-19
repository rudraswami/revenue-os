import { resolveContextMessageLimit } from "./context-window";

describe("context-window", () => {
  it("extends window for negotiation and post-sale stages", () => {
    expect(resolveContextMessageLimit("NEGOTIATION")).toBe(28);
    expect(resolveContextMessageLimit("PROPOSAL")).toBe(28);
    expect(resolveContextMessageLimit("WON")).toBe(28);
    expect(resolveContextMessageLimit("LOST")).toBe(28);
  });

  it("uses active limit for qualified", () => {
    expect(resolveContextMessageLimit("QUALIFIED")).toBe(24);
  });

  it("uses default for early pipeline", () => {
    expect(resolveContextMessageLimit("NEW")).toBe(16);
    expect(resolveContextMessageLimit("CONTACTED")).toBe(16);
  });
});
