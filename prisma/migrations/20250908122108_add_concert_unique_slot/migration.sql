-- DropIndex
DROP INDEX "idx_commande_userid_date";

-- CreateIndex
CREATE INDEX "idx_commande_userid_date" ON "Commande"("userId", "dateCommande");
