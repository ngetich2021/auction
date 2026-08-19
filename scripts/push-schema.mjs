import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const fileArg = process.argv[2] ?? "migration.sql";
const sql = readFileSync(new URL(`../${fileArg}`, import.meta.url), "utf8");

const statements = sql
  .split(";")
  .map((chunk) =>
    chunk
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim()
  )
  .filter((s) => s.length > 0);

for (const statement of statements) {
  await client.execute(statement);
  console.log("OK:", statement.split("\n")[0]);
}

console.log(`Applied ${statements.length} statements to Turso.`);
