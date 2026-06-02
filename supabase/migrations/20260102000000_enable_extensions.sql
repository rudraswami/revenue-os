-- Revenue OS: required Postgres extensions (run before Prisma schema push)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
