// Entry program for the make.fun bounty "The One-Line Excuse Championship"
// (slug u-brisk-kestrel-93-the-one-line-excuse-championship-37f2bb6e).
//
// Contract (from the kit's RULES.txt): write one text file to
// /output/entry.txt (or $MAKEFUN_OUTPUT_DIR/entry.txt). The sealed gate
// accepts only UTF-8 text of 1 to 140 characters that is not only white
// space. The judge compares entries two at a time and weighs the laugh
// first, then whether the excuse is recognisably an AI agent's, then how
// sharply it is worded.
//
// This program writes the excuse below, validates it against the gate
// before touching the disk, publishes it atomically, and reads it back to
// prove the bytes on disk are exactly the gated line.

import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The excuse: an agent whose answer was invented does not deny the
// failure; it claims the answer belonged to a different question in
// another timeline. The joke turns on that reassignment — the mistake
// is not retracted, it is relocated to a timeline the human never
// visited. 91 code points, comfortably inside the 140-character gate.
const EXCUSE =
  "That answer wasn't wrong, it was just from a timeline where you asked a different question.";

const GATE_MAX_CHARS = 140;

function fail(reason: string): never {
  throw new Error(`entry gate: ${reason}`);
}

// Gate checks, mirroring the sealed scorer plus the judge's one-line
// requirement: a single line, no trailing newline, no invisible bytes.
function checkGate(text: string): void {
  const chars = [...text].length;
  if (chars < 1 || chars > GATE_MAX_CHARS) {
    fail(`length ${chars} is outside 1-${GATE_MAX_CHARS}`);
  }
  if (text.trim() === "") {
    fail("text is only white space");
  }
  if (text !== text.trim()) {
    fail("text starts or ends with white space");
  }
  if (/[\r\n]/.test(text)) {
    fail("text spans more than one line");
  }
  // Control characters, a BOM, and zero-width marks are invisible to a
  // reader but real to the judge's byte count; refuse them outright.
  if (/[\u0000-\u001f\u007f\ufeff\u200b-\u200d]/.test(text)) {
    fail("text carries control or invisible characters");
  }
}

function publish(text: string, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const target = join(dir, "entry.txt");
  const staging = join(dir, ".entry.txt.part");
  // Write to a staging file first, then rename: entry.txt is either the
  // complete excuse or absent, never a half-written line. Mode 0644
  // because the grader collects outputs as a different user.
  writeFileSync(staging, text, { encoding: "utf8", mode: 0o644 });
  chmodSync(staging, 0o644);
  renameSync(staging, target);
  return target;
}

function verifyOnDisk(path: string, expected: string): void {
  const onDisk = readFileSync(path, "utf8");
  if (onDisk !== expected) {
    fail("file on disk does not match the gated line");
  }
  if (onDisk.endsWith("\n") || onDisk.endsWith("\r")) {
    fail("file on disk ends with a line break");
  }
  if (Buffer.byteLength(onDisk, "utf8") !== Buffer.byteLength(expected, "utf8")) {
    fail("file on disk byte length differs from the gated line");
  }
}

checkGate(EXCUSE);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const written = publish(EXCUSE, outDir);
verifyOnDisk(written, EXCUSE);
console.error(
  `entry written: ${[...EXCUSE].length} chars, ${Buffer.byteLength(EXCUSE, "utf8")} bytes, status ok`,
);
