/*
  Warnings:

  - You are about to drop the column `prix` on the `Concert` table. All the data in the column will be lost.
  - Added the required column `type` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('DEBOUT', 'ASSIS');

-- AlterTable
ALTER TABLE "Concert" DROP COLUMN "prix",
ADD COLUMN     "prixAssis" DECIMAL(10,2),
ADD COLUMN     "prixDebout" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "type" "PlaceType" NOT NULL;
