-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "resetTokenExp" TIMESTAMP(3),
ADD COLUMN     "resetTokenHash" TEXT;
