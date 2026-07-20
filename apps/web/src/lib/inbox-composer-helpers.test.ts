import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterSlashTemplates, formatQuotedReply } from "./inbox-composer-helpers";

describe("inbox-composer-helpers", () => {
  it("formats quoted reply with block prefix", () => {
    assert.equal(formatQuotedReply("Hello there"), "> Hello there\n\n");
  });

  it("truncates long quotes", () => {
    const long = "a".repeat(300);
    const out = formatQuotedReply(long, 50);
    assert.ok(out.startsWith("> "));
    assert.ok(out.includes("…"));
  });

  it("filters slash templates by title", () => {
    const templates = [
      { id: "1", title: "Pricing", body: "Our rates are…" },
      { id: "2", title: "Hours", body: "We are open…" },
    ];
    assert.equal(filterSlashTemplates("/pric", templates).length, 1);
    assert.equal(filterSlashTemplates("/", templates).length, 2);
    assert.equal(filterSlashTemplates("hello", templates).length, 0);
  });
});
