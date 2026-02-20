import { PrismaClient } from "@prisma/client";

function getPrismaClient() {
  if (process.env.NODE_ENV === "production") {
    return new PrismaClient();
  }

  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient();
  }

  return globalThis.__prisma;
}

const prisma = getPrismaClient();

export default prisma;
