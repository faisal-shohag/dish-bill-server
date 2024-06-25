/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Admins` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Admins_email_key" ON "Admins"("email");
