# 🔄 Redémarrage du backend requis

## ⚠️ Problème actuel

Le backend tourne avec l'ancien code. Les modifications suivantes ont été faites mais ne sont pas actives :

1. ✅ `realtimeEarningsTracker.js` - Calcul correct des semaines
2. ✅ `realtimeEarnings.js` - Nouvelle route API
3. ✅ `server.js` - Route ajoutée
4. ✅ `videos.js` - Tracking automatique des vues
5. ✅ `comments.js` - Tracking automatique des commentaires
6. ✅ `Earnings.jsx` - Noms de propriétés corrigés

## 🚀 Solution

### Sur votre machine locale (Windows)

```powershell
# Arrêter le serveur actuel (Ctrl+C dans le terminal où il tourne)

# Puis redémarrer
cd C:\Users\HP\CascadeProjects\bf-media\backend
npm start
# OU
node src/server.js
```

### Sur le serveur de production (Linux)

```bash
# Se connecter au serveur
ssh root@15.235.210.31

# Redémarrer avec PM2
cd /var/www/bf-media/backend
pm2 restart bf-media-backend

# Vérifier que ça démarre bien
pm2 logs bf-media-backend --lines 50

# Vérifier qu'il n'y a pas d'erreurs
pm2 logs bf-media-backend | grep -i error
```

## ✅ Vérification après redémarrage

### 1. Vérifier que le serveur démarre

Vous devriez voir :
```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🎬 BF Media Server Running                      ║
║   📡 Port: 5000                                   ║
║   🌍 Environment: development                     ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

### 2. Tester l'API realtime

```bash
# Avec curl (remplacer YOUR_TOKEN)
curl -X GET http://localhost:5000/api/earnings/realtime \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Devrait retourner :
```json
{
  "total_earnings": 45.1,
  "pending_earnings": 45.1,
  "paid_earnings": 0,
  "current_week": {
    "earnings": 45.1,
    "views": 6,
    "watch_minutes": 68
  },
  "last_week": {
    "earnings": 0,
    "views": 0,
    "watch_minutes": 0
  }
}
```

### 3. Vérifier le frontend

1. Ouvrir l'application dans le navigateur
2. Aller sur `/earnings`
3. Vider le cache (Ctrl+Shift+R)
4. Vérifier que "Cette semaine" affiche **45 F CFA** (ou la valeur actuelle)

## 📊 Résultat attendu

Après redémarrage, l'interface devrait afficher :

```
Revenus totaux: 45 F CFA
En attente: 45 F CFA

Cette semaine: 45 F CFA ✓ (au lieu de 0)
  - 6 vues
  - 68 min
```

## 🔍 Si ça ne fonctionne toujours pas

1. **Vérifier les logs** : `pm2 logs bf-media-backend`
2. **Vérifier la console du navigateur** (F12)
3. **Vérifier que la route est bien enregistrée** :
   ```javascript
   // Dans server.js, ligne 125
   app.use('/api/earnings', realtimeEarningsRoutes);
   ```
4. **Tester directement avec le script** :
   ```bash
   node test-realtime-api.js
   ```

## 💡 Note importante

Le système calcule "cette semaine" du **lundi au dimanche** (norme ISO 8601).

Exemple pour le 26 décembre 2025 (vendredi) :
- Début de semaine : 22 décembre 2025 (lundi) 00:00:00
- Fin de semaine : 28 décembre 2025 (dimanche) 23:59:59

Tous les revenus générés dans cette période apparaîtront dans "Cette semaine".
