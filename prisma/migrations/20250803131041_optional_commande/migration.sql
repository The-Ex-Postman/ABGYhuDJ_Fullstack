-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_commandeId_fkey";

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "commandeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;
