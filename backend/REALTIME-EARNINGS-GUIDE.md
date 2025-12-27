# Guide du système de revenus en temps réel

## 🎯 Vue d'ensemble

Le système de revenus en temps réel calcule et met à jour automatiquement les revenus des créateurs au fur et à mesure que leurs vidéos reçoivent des vues, des likes, des commentaires et des partages.

## 🚀 Fonctionnalités

### 1. **Calcul automatique en temps réel**
- ✅ Revenus calculés à chaque vue de vidéo
- ✅ Bonus pour les likes (+0.1 XOF)
- ✅ Bonus pour les commentaires (+0.5 XOF)
- ✅ Bonus pour les partages (+1 XOF)
- ✅ Mise à jour incrémentale (pas de recalcul complet)

### 2. **Formule de calcul**

```javascript
// Pour chaque vue
Revenus par vue = 0.5 XOF
Revenus par minute = 1 XOF × minutes visionnées
Bonus engagement = +10% si rétention ≥ 50%

// Exemple pour une vue de 5 minutes avec 70% de rétention
Vue: 0.5 XOF
Visionnage: 5 min × 1 XOF = 5 XOF
Sous-total: 5.5 XOF
Bonus 10%: 0.55 XOF
TOTAL: 6.05 XOF
```

### 3. **Estimation du temps de visionnage**

Si le temps de visionnage réel n'est pas disponible, le système estime :
```
Temps estimé = Durée vidéo × Nombre de vues × 70% (rétention moyenne)
```

### 4. **Auto-refresh de l'interface**

- Actualisation automatique toutes les **10 secondes**
- Affichage fluide et dynamique
- Pas besoin de recharger la page

## 📁 Fichiers créés/modifiés

### Backend

1. **`src/services/realtimeEarningsTracker.js`** (NOUVEAU)
   - Service principal de tracking en temps réel
   - Fonctions : `trackVideoView()`, `trackEngagement()`, `getUserRealtimeEarnings()`

2. **`src/routes/realtimeEarnings.js`** (NOUVEAU)
   - Route API `/api/earnings/realtime`

3. **`src/routes/videos.js`** (MODIFIÉ)
   - Ajout du tracking automatique lors des vues (ligne ~580)
   - Ajout du tracking automatique lors des likes (ligne ~468)

4. **`src/routes/comments.js`** (MODIFIÉ)
   - Ajout du tracking automatique lors des commentaires (ligne ~121)

5. **`src/services/earningsCalculator.js`** (MODIFIÉ)
   - Correction des noms de colonnes (`view_count`, `channel_id`)
   - Calcul intelligent du temps de visionnage

### Frontend

1. **`src/pages/Earnings.jsx`** (MODIFIÉ)
   - Auto-refresh toutes les 10 secondes
   - Affichage dynamique des revenus

2. **`src/pages/Admin.jsx`** (MODIFIÉ)
   - Bouton "Calculer" pour calcul manuel
   - Interface de configuration des taux

## 🔧 Installation

### 1. Créer la table `weekly_earnings`

```bash
# Sur le serveur
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

### 2. Déployer les fichiers

```bash
# Depuis votre machine locale
cd /path/to/bf-media

# Backend
scp -r backend/src/services/realtimeEarningsTracker.js root@15.235.210.31:/var/www/bf-media/backend/src/services/
scp backend/src/routes/realtimeEarnings.js root@15.235.210.31:/var/www/bf-media/backend/src/routes/
scp backend/src/routes/videos.js root@15.235.210.31:/var/www/bf-media/backend/src/routes/
scp backend/src/routes/comments.js root@15.235.210.31:/var/www/bf-media/backend/src/routes/
scp backend/src/services/earningsCalculator.js root@15.235.210.31:/var/www/bf-media/backend/src/services/

# Frontend
scp frontend/src/pages/Earnings.jsx root@15.235.210.31:/var/www/bf-media/frontend/src/pages/
scp frontend/src/pages/Admin.jsx root@15.235.210.31:/var/www/bf-media/frontend/src/pages/
```

### 3. Enregistrer la nouvelle route dans le serveur

Modifiez `backend/src/server.js` pour ajouter :

```javascript
const realtimeEarningsRoutes = require('./routes/realtimeEarnings');
app.use('/api/earnings', realtimeEarningsRoutes);
```

### 4. Redémarrer les services

```bash
# Sur le serveur
cd /var/www/bf-media/backend
pm2 restart bf-media-backend

# Rebuilder le frontend
cd /var/www/bf-media/frontend
npm run build

# Redémarrer nginx si nécessaire
systemctl restart nginx
```

## 📊 Flux de données

```
┌─────────────────┐
│  Utilisateur    │
│  regarde vidéo  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  POST /api/videos/:id/  │
│  view                   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  UPDATE videos          │
│  SET view_count + 1     │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  trackVideoView()            │
│  - Calcule revenus           │
│  - INSERT user_earnings      │
│  - UPDATE users totaux       │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Frontend auto-refresh       │
│  GET /api/earnings/realtime  │
│  Toutes les 10 secondes      │
└──────────────────────────────┘
```

## 🎨 Interface utilisateur

L'interface affiche en temps réel :

1. **Revenus totaux** : Mis à jour automatiquement
2. **Revenus de la semaine** : Calcul en temps réel
3. **Vues et minutes** : Statistiques actualisées
4. **Tendance** : Comparaison avec la semaine précédente
5. **Estimation fin de semaine** : Projection basée sur les données actuelles

## 🔍 Débogage

### Vérifier que les revenus sont enregistrés

```sql
-- Voir les derniers revenus enregistrés
SELECT * FROM user_earnings 
ORDER BY created_at DESC 
LIMIT 20;

-- Voir les totaux par utilisateur
SELECT 
  u.username,
  u.total_earnings,
  u.pending_earnings,
  COUNT(ue.id) as earnings_count
FROM users u
LEFT JOIN user_earnings ue ON u.id = ue.user_id
WHERE u.is_verified = TRUE
GROUP BY u.id
ORDER BY u.total_earnings DESC;
```

### Vérifier les logs

```bash
# Logs backend
pm2 logs bf-media-backend

# Chercher les erreurs de tracking
grep "Error tracking" /var/log/bf-media/backend.log
```

### Tester manuellement

```bash
# Tester l'API realtime
curl -X GET http://localhost:3000/api/earnings/realtime \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 Optimisations

### 1. **Performance**
- Mise à jour incrémentale (pas de recalcul complet)
- Index sur les tables pour requêtes rapides
- Pas de JOIN complexes lors du tracking

### 2. **Scalabilité**
- Système asynchrone (ne bloque pas les requêtes)
- Gestion d'erreurs pour éviter les crashs
- Transactions pour garantir la cohérence

### 3. **Précision**
- Utilisation du temps de visionnage réel quand disponible
- Estimation intelligente basée sur la rétention moyenne
- Bonus d'engagement pour récompenser l'interaction

## 🎯 Résultats attendus

Pour un utilisateur avec **266 vues** sur une vidéo de **292 minutes** :

```
Vues: 266 × 0.5 = 133 XOF
Temps estimé: 292 min × 266 vues × 70% = 54,370 minutes
Visionnage: 54,370 × 1 = 54,370 XOF
Sous-total: 54,503 XOF
Bonus 10%: 5,450 XOF
TOTAL: 59,953 XOF ≈ 60,000 XOF
```

**Avant** : 133 XOF (seulement les vues)
**Après** : 60,000 XOF (vues + visionnage + bonus)

## 🔐 Sécurité

- ✅ Seuls les utilisateurs vérifiés reçoivent des revenus
- ✅ Validation des données avant insertion
- ✅ Gestion d'erreurs pour éviter les abus
- ✅ Logs pour traçabilité

## 📞 Support

En cas de problème :
1. Vérifier les logs backend
2. Vérifier que la table `weekly_earnings` existe
3. Vérifier que les colonnes `total_earnings`, `pending_earnings` existent dans `users`
4. Tester l'API `/api/earnings/realtime` manuellement
5. Vérifier que le backend a été redémarré après déploiement
