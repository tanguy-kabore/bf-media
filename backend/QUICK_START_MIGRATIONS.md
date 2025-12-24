# 🚀 Guide de Démarrage Rapide - Migrations

## En 3 étapes simples

### 1️⃣ Voir le statut actuel

```bash
cd backend
npm run migrate:status
```

### 2️⃣ Exécuter les migrations en attente

```bash
npm run migrate
```

### 3️⃣ Créer une nouvelle migration

```bash
npm run migrate:create nom_de_votre_migration
```

## 📝 Exemple pratique

### Ajouter une colonne "phone" à la table users

**1. Créer la migration :**
```bash
npm run migrate:create add_phone_to_users
```

**2. Éditer le fichier créé dans `src/database/migrations/` :**
```javascript
module.exports = {
  async up(connection) {
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN phone VARCHAR(20) AFTER email,
      ADD INDEX idx_phone (phone)
    `);
  },

  async down(connection) {
    await connection.query(`
      ALTER TABLE users 
      DROP INDEX idx_phone,
      DROP COLUMN phone
    `);
  }
};
```

**3. Exécuter la migration :**
```bash
npm run migrate
```

**4. Vérifier :**
```bash
npm run migrate:status
```

## 🔄 Annuler une migration

```bash
npm run migrate:rollback
```

## 📚 Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run migrate` | Exécute toutes les migrations en attente |
| `npm run migrate:create <nom>` | Crée une nouvelle migration |
| `npm run migrate:status` | Affiche le statut des migrations |
| `npm run migrate:rollback` | Annule la dernière migration |

## ⚡ Exemples rapides

### Ajouter une colonne
```javascript
ALTER TABLE table_name 
ADD COLUMN column_name TYPE AFTER existing_column
```

### Créer une table
```javascript
CREATE TABLE IF NOT EXISTS table_name (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
```

### Ajouter un index
```javascript
CREATE INDEX idx_name ON table_name(column_name)
```

### Modifier une colonne
```javascript
ALTER TABLE table_name 
MODIFY COLUMN column_name NEW_TYPE
```

## 🎯 Workflow quotidien

1. **Besoin de modifier la base ?**
   ```bash
   npm run migrate:create ma_modification
   ```

2. **Éditer le fichier créé** dans `src/database/migrations/`

3. **Appliquer les changements**
   ```bash
   npm run migrate
   ```

4. **Vérifier que tout fonctionne** ✅

## ⚠️ Important

- ✅ Toujours tester sur une base de développement d'abord
- ✅ Faire un backup avant de migrer en production
- ✅ Vérifier que le rollback fonctionne (`down()`)
- ✅ Une migration = un changement logique

## 📖 Documentation complète

Pour plus de détails, consultez `MIGRATIONS.md`
