import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterSlashTemplates,
  formatQuotedReply,
  parseQuotedReply,
  stripQuotedReply,
  applyTemplateToDraft,
  insertAtCursor,
} from "./inbox-composer-helpers";
import { getCopyableMessageText, inferInboxMediaFilename, formatPinnedNoteText } from "./inbox-message-helpers";

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

  it("parses and strips quoted reply prefix", () => {
    const draft = formatQuotedReply("Hi") + "My reply";
    assert.deepEqual(parseQuotedReply(draft), { quote: "Hi", body: "My reply" });
    assert.equal(stripQuotedReply(draft), "My reply");
  });

  it("applies templates while keeping quote prefix", () => {
    const draft = formatQuotedReply("Hi") + "Old body";
    assert.equal(applyTemplateToDraft(draft, "New body"), formatQuotedReply("Hi") + "New body");
  });

  it("inserts text at cursor", () => {
    const { next, cursor } = insertAtCursor("Hello world", "😊", 5, 5);
    assert.equal(next, "Hello😊 world");
    assert.equal(cursor, 7);
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

describe("inbox-message-helpers", () => {
  it("returns copyable text for plain and captioned media", () => {
    assert.equal(getCopyableMessageText("Hello"), "Hello");
    assert.equal(getCopyableMessageText("Document: quote.pdf"), "quote.pdf");
    assert.equal(getCopyableMessageText("[Document]"), null);
  });

  it("infers media filenames", () => {
    assert.equal(
      inferInboxMediaFilename("Document: brochure", "DOCUMENT", "msg-abc12345"),
      "brochure.pdf",
    );
    assert.equal(inferInboxMediaFilename(null, "IMAGE", "msg-abc12345"), "image-msg-abc1.jpg");
  });

  it("formats pinned note text", () => {
    assert.match(formatPinnedNoteText("Quoted ₹45k", new Date("2026-07-20T10:00:00")), /Pinned from chat/);
    assert.match(formatPinnedNoteText("Quoted ₹45k", new Date("2026-07-20T10:00:00")), /₹45k/);
  });
});
