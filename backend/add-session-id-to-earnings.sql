-- Ajouter la colonne session_id à user_earnings pour lier les revenus aux sessions
ALTER TABLE user_earnings 
ADD COLUMN session_id VARCHAR(255) NULL AFTER video_id,
ADD INDEX idx_session_id (session_id);

-- Afficher la structure mise à jour
DESCRIBE user_earnings;
