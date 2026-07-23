import assert from "node:assert/strict";
import test from "node:test";
import {
  formatProgramItem,
  normalizeProgramItems,
} from "./programItems.js";

test("formats seeded object programs without object coercion", () => {
  assert.equal(
    formatProgramItem({ name: "Core stability", visitsPerWeek: 2 }),
    "Core stability\nVisits per week: 2",
  );
});

test("keeps legacy note and current string program payloads readable", () => {
  assert.deepEqual(
    normalizeProgramItems([{ note: "Gentle mobility" }, "Balance training"]),
    ["Gentle mobility", "Balance training"],
  );
});

test("omits object metadata from the displayed program", () => {
  assert.equal(
    formatProgramItem({
      id: 12,
      title: "Shoulder rehab",
      active: true,
      updatedAt: "2026-07-23T00:00:00.000Z",
    }),
    "Shoulder rehab\nActive: Yes",
  );
});
