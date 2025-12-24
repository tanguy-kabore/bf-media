# Guide de déploiement des corrections du système de revenus

## 🔧 Problèmes corrigés

1. ✅ Table `weekly_earnings` manquante
2. ✅ Calcul de la durée de visionnage (était à 0, maintenant calculé avec 70% de rétention)
3. ✅ Noms de colonnes incorrects (`views_count` → `view_count`, `user_id` → `channel_id`)
4. ✅ Bonus d'engagement appliqué correctement

## 📋 Étapes de déploiement sur le serveur de production

### 1. Créer la table `weekly_earnings`

```bash
# Se connecter au serveur
ssh root@15.235.210.31

# Aller dans le dossier backend
cd /var/www/bf-media/backend

# Se connecter à MySQL
mysql -u root -p bf_media

# Exécuter la commande SQL
CREATE TABLE IF NOT EXISTS weekly_earnings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  week_number VARCHAR(10) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_views INT DEFAULT 0,
  total_watch_minutes INT DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_week (user_id, week_number),
  INDEX idx_user_week (user_id, week_number),
  INDEX idx_week_number (week_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# Quitter MySQL
exit;
```

### 2. Déployer les fichiers corrigés

```bash
# Sur votre machine locale, dans le dossier du projet
# Copier les fichiers corrigés vers le serveur

# Fichier principal corrigé
scp backend/src/services/earningsCalculator.js root@15.235.210.31:/var/www/bf-media/backend/src/services/

# Fichier de routes admin
scp backend/src/routes/adminEarnings.js root@15.235.210.31:/var/www/bf-media/backend/src/routes/

# Frontend - Admin.jsx avec le bouton calculer et la config des taux
scp frontend/src/pages/Admin.jsx root@15.235.210.31:/var/www/bf-media/frontend/src/pages/
```

### 3. Recalculer les revenus existants

```bash
# Sur le serveur
cd /var/www/bf-media/backend

# Copier le script de recalcul
# (Copiez le contenu de recalculate-earnings.js sur le serveur)

# Exécuter le recalcul
node recalculate-earnings.js
```

### 4. Redémarrer les services

```bash
# Redémarrer le backend
pm2 restart bf-media-backend

# Ou si vous utilisez systemd
systemctl restart bf-media-backend

# Vérifier les logs
pm2 logs bf-media-backend

# Rebuilder le frontend si nécessaire
cd /var/www/bf-media/frontend
npm run build
```

## 🧪 Tests après déploiement

### 1. Vérifier la table weekly_earnings

```bash
mysql -u root -p bf_media -e "SHOW TABLES LIKE 'weekly_earnings';"
```

### 2. Tester l'API admin

```bash
# Tester la route des statistiques
curl -X GET http://15.235.210.31/api/admin/earnings/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Tester la route des utilisateurs
curl -X GET http://15.235.210.31/api/admin/earnings/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Tester dans l'interface

1. Se connecter en tant qu'admin
2. Aller dans **Administration → Revenus**
3. Vérifier que les statistiques s'affichent correctement
4. Cliquer sur le bouton **📅 Calculer** pour un utilisateur
5. Vérifier que les revenus sont calculés avec la durée de visionnage

## 📊 Formule de calcul des revenus

```
Revenus = (Vues × 0.5 XOF) + (Minutes × 1 XOF) + Bonus

Durée estimée = Durée vidéo × Vues × 70% de rétention

Bonus = +10% si rétention ≥ 50%
```

### Exemple pour 266 vues sur une vidéo de 4h52min (292 minutes)

```
Durée totale estimée = 292 min × 266 vues × 0.7 = 54,370 minutes
Revenus vues = 266 × 0.5 = 133 XOF
Revenus visionnage = 54,370 × 1 = 54,370 XOF
Sous-total = 54,503 XOF
Bonus 10% = 5,450 XOF
TOTAL = 59,953 XOF ≈ 60,000 XOF
```

## 🔍 Vérification des données

Pour vérifier les revenus d'un utilisateur spécifique :

```sql
-- Voir les vidéos et vues
SELECT v.title, v.view_count, v.duration
FROM videos v
INNER JOIN channels c ON v.channel_id = c.id
INNER JOIN users u ON c.user_id = u.id
WHERE u.username = 'tipoko';

-- Voir les revenus
SELECT * FROM user_earnings WHERE user_id = (
  SELECT id FROM users WHERE username = 'tipoko'
);

-- Voir les totaux
SELECT username, total_earnings, pending_earnings, paid_earnings
FROM users
WHERE username = 'tipoko';
```

## ⚠️ Notes importantes

1. **Sauvegarde** : Faites une sauvegarde de la base de données avant de recalculer les revenus
2. **Redémarrage** : Le backend DOIT être redémarré après le déploiement des fichiers
3. **Cache** : Videz le cache du navigateur si l'interface ne se met pas à jour
4. **Logs** : Surveillez les logs pour détecter d'éventuelles erreurs

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du backend : `pm2 logs bf-media-backend`
2. Vérifiez que la table weekly_earnings existe
3. Vérifiez que les colonnes total_earnings, pending_earnings existent dans users
4. Testez avec le script recalculate-earnings.js en local d'abord
