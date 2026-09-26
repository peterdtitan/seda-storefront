// Creates or updates a staff account.
//
// The invite screen is step 11, so until then this is the only way to make the first
// account — and it stays useful afterwards for the one thing the UI cannot do, which
// is create the owner who would have sent the invitation.
//
//   pnpm admin:invite peter@example.com --name "Peter" --role owner
//   pnpm admin:invite ops@example.com   --role delivery --role refunds
//   pnpm admin:invite dev@example.com   --superuser
//   pnpm admin:invite --list

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROLES = ["content", "refunds", "delivery", "finance", "owner"];

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const match = readFileSync(join(root, ".env.local"), "utf8").match(/^DATABASE_URL=(.*)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* fall through */
  }
  return "";
}

const argv = process.argv.slice(2);
function flag(name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === `--${name}`) out.push(argv[i + 1]);
  return out;
}
const has = (name) => argv.includes(`--${name}`);

const url = connectionString();
if (!url) {
  console.error("DATABASE_URL is not set, and .env.local does not define it.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });

try {
  if (has("list")) {
    const rows = await sql`
      select u.email, u.name, u.tier, u.status, u.last_seen_at,
             array_remove(array_agg(r.role), null) as roles
      from admin_users u left join admin_roles r on r.user_id = u.id
      group by u.id order by u.tier, u.email`;

    if (rows.length === 0) console.log("No accounts yet.");
    for (const r of rows) {
      const seen = r.last_seen_at ? new Date(r.last_seen_at).toISOString().slice(0, 16) : "never";
      console.log(
        `${r.email.padEnd(32)} ${r.tier.padEnd(10)} ${r.status.padEnd(10)} ` +
          `${(r.roles.join(",") || "-").padEnd(26)} seen ${seen}`,
      );
    }
    process.exit(0);
  }

  const email = argv.find((a) => a.includes("@"));
  if (!email) {
    console.error("Give an email address. See the header of this file for examples.");
    process.exit(1);
  }

  const roles = flag("role").filter(Boolean);
  const unknown = roles.filter((r) => !ROLES.includes(r));
  if (unknown.length) {
    console.error(`Unknown role(s): ${unknown.join(", ")}. Known: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const tier = has("superuser") ? "superuser" : "staff";
  const name = flag("name")[0] ?? null;

  const [user] = await sql`
    insert into admin_users (email, name, tier, status)
    values (${email}, ${name}, ${tier}, 'invited')
    on conflict (email) do update
      set name = coalesce(excluded.name, admin_users.name),
          tier = excluded.tier,
          status = case when admin_users.status = 'suspended' then 'invited'
                        else admin_users.status end
    returning id, email, tier, status`;

  if (roles.length) {
    await sql`
      insert into admin_roles ${sql(roles.map((role) => ({ user_id: user.id, role })))}
      on conflict do nothing`;
  }

  const [{ roles: held }] = await sql`
    select array_remove(array_agg(role), null) as roles
    from admin_roles where user_id = ${user.id}`;

  console.log(`${user.email} — ${user.tier}, ${user.status}, roles: ${held.join(", ") || "none"}`);
  console.log("\nThey sign in at /admin/sign-in. No password is set or needed.");
} finally {
  await sql.end();
}
