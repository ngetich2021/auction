import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { generateId } from "@/lib/id";

// The one model with no `id` column (composite-keyed on identifier+token) — every other
// model must get a generated id injected before the DB-level cuid() default would fire.
const MODELS_WITHOUT_ID = new Set(["VerificationToken"]);

function withGeneratedIds(client: PrismaClient) {
  return client.$extends({
    name: "generated-short-ids",
    query: {
      $allModels: {
        create({ model, args, query }) {
          if (!MODELS_WITHOUT_ID.has(model)) {
            args.data = { id: generateId(), ...args.data } as typeof args.data;
          }
          return query(args);
        },
        createMany({ model, args, query }) {
          if (!MODELS_WITHOUT_ID.has(model)) {
            const items = Array.isArray(args.data) ? args.data : [args.data];
            args.data = items.map((item) => ({ id: generateId(), ...item })) as typeof args.data;
          }
          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return withGeneratedIds(new PrismaClient({ adapter }));
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
