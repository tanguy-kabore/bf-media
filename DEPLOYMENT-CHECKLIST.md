# ✅ Checklist de déploiement - Système de revenus en temps réel

## 📦 Fichiers à déployer

### Backend - Nouveaux fichiers
- [ ] `backend/src/services/realtimeEarningsTracker.js`
- [ ] `backend/src/routes/realtimeEarnings.js`

### Backend - Fichiers modifiés
- [ ] `backend/src/server.js` (lignes 29 et 125)
- [ ] `backend/src/routes/videos.js` (lignes 13, 580, 468)
- [ ] `backend/src/routes/comments.js` (lignes 8, 121)
- [ ] `backend/src/services/earningsCalculator.js` (calcul durée visionnage)

### Frontend - Fichiers modifiés
- [ ] `frontend/src/pages/Earnings.jsx` (auto-refresh 10s)
- [ ] `frontend/src/pages/Admin.jsx` (bouton calculer + config taux)

## 🗄️ Base de données

### 1. Créer la table `weekly_earnings`

```bash
ssh root@15.235.210.31
mysql -u root -p bf_media
```

```sql
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
```

- [ ] Table `weekly_earnings` créée

### 2. Vérifier les colonnes earnings dans `users`

```sql
SHOW COLUMNS FROM users LIKE '%earnings%';
```

Devrait afficher :
- `total_earnings`
- `pending_earnings`
- `paid_earnings`

- [ ] Colonnes earnings vérifiées

### 3. Ajouter une colonne `video_id` dans `user_earnings` (si manquante)

```sql
ALTER TABLE user_earnings ADD COLUMN video_id VARCHAR(36) NULL AFTER user_id;
ALTER TABLE user_earnings ADD INDEX idx_video_id (video_id);
```

- [ ] Colonne `video_id` ajoutée

## 🚀 Commandes de déploiement

### 1. Copier les fichiers depuis votre machine locale

```bash
# Aller dans le dossier du projet
cd C:\Users\HP\CascadeProjects\bf-media

# Backend - nouveaux fichiers
scp backend/src/services/realtimeEarningsTracker.js root@15.235.210.31:/var/www/bf-media/backend/src/services/
scp backend/src/routes/realtimeEarnings.js root@15.235.210.31:/var/www/bf-media/backend/src/routes/

# Backend - fichiers modifiés
scp backend/src/server.js root@15.235.210.31:/var/www/bf-media/backend/src/
scp backend/src/routes/videos.js root@15.235.210.31:/var/www/bf-media/backend/src/routes/
scp backend/src/routes/comments.js root@15.235.210.31:/var/www/bf-media/backend/src/routes/
scp backend/src/services/earningsCalculator.js root@15.235.210.31:/var/www/bf-media/backend/src/services/

# Frontend
scp frontend/src/pages/Earnings.jsx root@15.235.210.31:/var/www/bf-media/frontend/src/pages/
scp frontend/src/pages/Admin.jsx root@15.235.210.31:/var/www/bf-media/frontend/src/pages/
```

- [ ] Fichiers backend copiés
- [ ] Fichiers frontend copiés

### 2. Redémarrer le backend

```bash
ssh root@15.235.210.31
cd /var/www/bf-media/backend
pm2 restart bf-media-backend
pm2 logs bf-media-backend --lines 50
```

- [ ] Backend redémarré
- [ ] Logs vérifiés (pas d'erreurs)

### 3. Rebuilder le frontend

```bash
cd /var/www/bf-media/frontend
npm run build
```

- [ ] Frontend rebuild

### 4. Redémarrer nginx (si nécessaire)

```bash
systemctl restart nginx
```

- [ ] Nginx redémarré

## 🧪 Tests après déploiement

### 1. Vérifier que le serveur démarre sans erreur

```bash
pm2 logs bf-media-backend --lines 50
```

Rechercher :
- ✅ "BF Media Server Running"
- ❌ Pas d'erreurs "Cannot find module"
- ❌ Pas d'erreurs de syntaxe

- [ ] Serveur démarre correctement

### 2. Tester l'API realtime

```bash
# Remplacer YOUR_TOKEN par un token valide
curl -X GET http://15.235.210.31/api/earnings/realtime \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Devrait retourner :
```json
{
  "total_earnings": 0,
  "pending_earnings": 0,
  "paid_earnings": 0,
  "current_week": { "earnings": 0, "views": 0, "watch_minutes": 0 },
  "last_week": { "earnings": 0, "views": 0, "watch_minutes": 0 },
  "trend": 0,
  "rates": { ... }
}
```

- [ ] API `/api/earnings/realtime` fonctionne

### 3. Tester une vue de vidéo

1. Ouvrir l'application dans le navigateur
2. Se connecter avec un compte vérifié
3. Regarder une vidéo pendant quelques secondes
4. Vérifier dans la base de données :

```sql
SELECT * FROM user_earnings ORDER BY created_at DESC LIMIT 5;
```

- [ ] Vue enregistrée
- [ ] Revenus calculés automatiquement

### 4. Tester l'interface utilisateur

1. Aller sur `/earnings`
2. Vérifier que les revenus s'affichent
3. Attendre 10 secondes
4. Vérifier que les données se rafraîchissent automatiquement

- [ ] Interface affiche les revenus
- [ ] Auto-refresh fonctionne (10s)

### 5. Tester l'interface admin

1. Se connecter en tant qu'admin
2. Aller dans **Administration → Revenus**
3. Vérifier que les statistiques s'affichent
4. Cliquer sur le bouton **📅 Calculer** pour un utilisateur

- [ ] Dashboard admin fonctionne
- [ ] Bouton "Calculer" fonctionne

## 🔍 Vérifications finales

### Base de données

```sql
-- Vérifier les revenus
SELECT 
  u.username,
  u.total_earnings,
  u.pending_earnings,
  COUNT(ue.id) as earnings_count
FROM users u
LEFT JOIN user_earnings ue ON u.id = ue.user_id
WHERE u.is_verified = TRUE
GROUP BY u.id
ORDER BY u.total_earnings DESC
LIMIT 10;
```

- [ ] Revenus enregistrés correctement

### Logs

```bash
# Vérifier les logs pour erreurs
pm2 logs bf-media-backend | grep -i error

# Vérifier les logs de tracking
pm2 logs bf-media-backend | grep "tracking"
```

- [ ] Pas d'erreurs dans les logs
- [ ] Tracking fonctionne

## 📊 Résultats attendus

Pour un utilisateur avec **266 vues** sur une vidéo de **292 minutes** :

**Avant** : 133 XOF (seulement vues)
**Après** : ~60,000 XOF (vues + visionnage + bonus)

Formule :
```
Vues: 266 × 0.5 = 133 XOF
Temps estimé: 292 min × 266 × 70% = 54,370 minutes
Visionnage: 54,370 × 1 = 54,370 XOF
Sous-total: 54,503 XOF
Bonus 10%: 5,450 XOF
TOTAL: 59,953 XOF
```

- [ ] Revenus calculés correctement
- [ ] Temps de visionnage pris en compte
- [ ] Bonus d'engagement appliqué

## 🆘 En cas de problème

### Erreur "Table doesn't exist"
```sql
-- Créer la table manuellement
SOURCE /var/www/bf-media/backend/fix-production-earnings.sql
```

### Erreur "Cannot find module"
```bash
# Vérifier que tous les fichiers sont présents
ls -la /var/www/bf-media/backend/src/services/realtimeEarningsTracker.js
ls -la /var/www/bf-media/backend/src/routes/realtimeEarnings.js
```

### Revenus ne s'affichent pas
1. Vérifier que le backend est redémarré
2. Vider le cache du navigateur (Ctrl+Shift+R)
3. Vérifier les logs : `pm2 logs bf-media-backend`

### Auto-refresh ne fonctionne pas
1. Ouvrir la console du navigateur (F12)
2. Vérifier les erreurs réseau
3. Vérifier que l'API `/api/earnings/realtime` répond

## ✅ Déploiement terminé

Une fois toutes les cases cochées :
- [ ] Système de revenus en temps réel opérationnel
- [ ] Interface utilisateur fluide et dynamique
- [ ] Calcul automatique à chaque vue/engagement
- [ ] Auto-refresh toutes les 10 secondes

🎉 **Félicitations ! Le système de revenus en temps réel est déployé avec succès !**
