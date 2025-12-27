-- Ajouter les types d'engagement (like, comment, share) à l'ENUM earning_type
ALTER TABLE user_earnings 
MODIFY COLUMN earning_type ENUM('view', 'ad', 'subscription', 'donation', 'like', 'comment', 'share', 'other') NOT NULL;

-- Afficher la structure mise à jour
DESCRIBE user_earnings;
