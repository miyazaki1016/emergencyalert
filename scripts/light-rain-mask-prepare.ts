/** Prepare a versioned LRPM archive from a private Supabase Storage signed URL.
 * Read-only: downloads an existing object; never uploads or changes the DB.
 * Usage: LRPM_ARCHIVE_URL=<signed-url> LRPM_ARCHIVE_SHA256=<sha256> \
 *   npx tsx scripts/light-rain-mask-prepare.ts <cache-root>
 * Then set JMA_Z10_PIXEL_MASK_DIR=<cache-root>/20260101-v1.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openNationwidePixelMasks } from "../lib/weather/rain/lightRainPixelMaskLoader";

const version = "20260101-v1";
const destination = process.argv[2];
const source = process.env.LRPM_ARCHIVE_URL;
const expected = process.env.LRPM_ARCHIVE_SHA256;
if (!destination || !source || !/^https:\/\//.test(source) || !expected || !/^[a-f0-9]{64}$/i.test(expected)) {
  throw new Error("Specify cache-root, HTTPS LRPM_ARCHIVE_URL and 64-hex LRPM_ARCHIVE_SHA256");
}
const target = join(resolve(destination), version);
function validate(root: string): void {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as { files: Record<string, unknown> };
  if (Object.keys(manifest.files ?? {}).length !== 733) throw new Error("LRPM_TILE_COUNT_MISMATCH");
  const masks = openNationwidePixelMasks(root, "20260101");
  // Validate every file, including tiles that might never be rainy in a test run.
  for (const key of Object.keys(manifest.files)) {
    const match = /^z10\/(\d+)\/(\d+)\.bin$/.exec(key);
    if (!match) throw new Error("LRPM_UNEXPECTED_FILE: " + key);
    masks.load(Number(match[1]), Number(match[2]));
  }
}
async function main() {
  if (existsSync(target)) {
    validate(target);
    console.log(JSON.stringify({ event: "LRPM_CACHE_VALID", target, tiles: 733 }));
    return;
  }
  const scratch = mkdtempSync(join(tmpdir(), "lrpm-"));
  try {
    const response = await fetch(source!, { cache: "no-store", signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error("LRPM_DOWNLOAD_FAILED: HTTP " + response.status);
    const maxArchiveBytes = 10 * 1024 * 1024;
    const declaredSize = Number(response.headers.get("content-length"));
    if (declaredSize > maxArchiveBytes) throw new Error("LRPM_ARCHIVE_TOO_LARGE");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxArchiveBytes) throw new Error("LRPM_ARCHIVE_TOO_LARGE");
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest.toLowerCase() !== expected!.toLowerCase()) throw new Error("LRPM_ARCHIVE_CHECKSUM_MISMATCH");
    const archive = join(scratch, "masks.tar.gz");
    writeFileSync(archive, bytes);
    const entries = execFileSync("tar", ["-tzf", archive], { encoding: "utf8", maxBuffer: 2_000_000 }).split("\n").filter(Boolean);
    const listing = execFileSync("tar", ["-tvzf", archive], { encoding: "utf8", maxBuffer: 2_000_000 }).split("\n").filter(Boolean);
    // Only regular files and directories: reject symlinks, hardlinks and special files.
    if (listing.some(line => !["-", "d"].includes(line[0]))) throw new Error("LRPM_UNSAFE_ARCHIVE_ENTRY");
    if (!entries.length || entries.some(e => e.startsWith("/") || e.split("/").includes("..") || e.includes("\\") || e.startsWith("-"))) {
      throw new Error("LRPM_UNSAFE_ARCHIVE_PATH");
    }
    const unpacked = join(scratch, "unpacked");
    mkdirSync(unpacked);
    execFileSync("tar", ["-xzf", archive, "-C", unpacked, "--no-same-owner", "--no-same-permissions"]);
    let root = unpacked;
    if (!existsSync(join(root, "manifest.json"))) {
      const dirs = readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory());
      if (dirs.length !== 1) throw new Error("LRPM_ARCHIVE_LAYOUT_UNEXPECTED");
      root = join(root, dirs[0].name);
    }
    validate(root);
    mkdirSync(resolve(destination!), { recursive: true });
    // Never overwrite an existing version: fail rather than replace in-use masks.
    if (existsSync(target)) throw new Error("LRPM_CACHE_ALREADY_EXISTS");
    renameSync(root, target);
    console.log(JSON.stringify({ event: "LRPM_CACHE_PREPARED", target, tiles: 733, sha256: digest }));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
