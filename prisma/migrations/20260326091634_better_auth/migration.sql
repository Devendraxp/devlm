/*
  Warnings:

  - A unique constraint covering the columns `[identifier]` on the table `verification` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "verification_identifier_idx";

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_key" ON "verification"("identifier");
