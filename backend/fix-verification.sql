-- Script pour activer la vérification du compte test

-- Vérifier l'état actuel
SELECT id, username, email, display_name, is_verified 
FROM users 
WHERE username = 'test' OR email LIKE '%test%'
LIMIT 1;

-- Activer la vérification pour l'utilisateur test
UPDATE users 
SET is_verified = 1, 
    verification_badge = 1,
    verified_at = NOW()
WHERE username = 'test' OR email LIKE '%test%';

-- Vérifier que c'est bien appliqué
SELECT id, username, email, display_name, is_verified, verified_at
FROM users 
WHERE username = 'test' OR email LIKE '%test%'
LIMIT 1;

-- Afficher les vidéos de cet utilisateur pour confirmer
SELECT v.id, v.title, ch.name as channel_name, u.is_verified as user_verified
FROM videos v
JOIN channels ch ON v.channel_id = ch.id
JOIN users u ON ch.user_id = u.id
WHERE u.username = 'test' OR u.email LIKE '%test%'
LIMIT 5;
