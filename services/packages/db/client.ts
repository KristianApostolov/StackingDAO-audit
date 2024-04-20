"use server";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

migrate(db, { migrationsFolder: "./drizzle" });
