// Applies db/migrations/*.sql in order, once each.
//
// psql is not a dependency of this project, so this uses the same driver the app
// does. Run it with `pnpm db:migrate`; `pnpm db:status` lists without applying.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "db", "migrations");
const dryRun = process.argv.includes("--status");

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const file = readFileSync(join(root, ".env.local"), "utf8");
    const match = file.match(/^DATABASE_URL=(.*)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local; fall through to the error below */
  }
  return "";
}

const url = connectionString();
if (!url) {
  console.error("DATABASE_URL is not set, and .env.local does not define it.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} });

try {
  await sql`
    create table if not exists schema_migrations (
      filename   text        primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = new Set(
    (await sql`select filename from schema_migrations`).map((r) => r.filename),
  );
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  let ran = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ok    ${file}`);
      continue;
    }
    if (dryRun) {
      console.log(`  PENDING ${file}`);
      ran += 1;
      continue;
    }

    // Each file is one transaction, so a half-applied migration cannot be recorded
    // as done. The DDL in these files is all `if not exists`, so a rerun is harmless.
    process.stdout.write(`  apply ${file} … `);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, file), "utf8"));
      await tx`insert into schema_migrations (filename) values (${file})`;
    });
    console.log("done");
    ran += 1;
  }

  console.log(
    dryRun
      ? `\n${ran} pending, ${files.length - ran} applied.`
      : `\n${ran} applied, ${files.length} total.`,
  );
} finally {
  await sql.end();
}
