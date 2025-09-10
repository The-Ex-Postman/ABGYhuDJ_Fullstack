-- INDEXES
CREATE INDEX IF NOT EXISTS idx_commande_userid_date
  ON "Commande" ("userId", "dateCommande" DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_concert   ON "Ticket" ("concertId");
CREATE INDEX IF NOT EXISTS idx_ticket_commande  ON "Ticket" ("commandeId");
CREATE INDEX IF NOT EXISTS idx_concert_date     ON "Concert" ("date");

-- CONTRAINTES (pas de IF NOT EXISTS)
ALTER TABLE "Concert"
  ADD CONSTRAINT concert_unique_slot UNIQUE ("ville","date","lieu");
ALTER TABLE "Ticket"
  ADD CONSTRAINT ticket_quantite_positive CHECK ("quantite" > 0);
ALTER TABLE "Ticket"
  ADD CONSTRAINT ticket_prix_nonneg CHECK ("prixUnitaire" >= 0);
ALTER TABLE "Concert"
  ADD CONSTRAINT concert_places_nonneg CHECK ("placesDispo" >= 0);
ALTER TABLE "Commande"
  ADD CONSTRAINT commande_total_nonneg CHECK ("total" >= 0);

-- Unicité email insensible à la casse (on GARDE l’unique Prisma "User_email_key")
CREATE UNIQUE INDEX IF NOT EXISTS user_email_lower_key ON "User"(LOWER("email"));