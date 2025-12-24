# Guide des Migrations de Base de Données

## 🎯 Vue d'ensemble

Le système de migrations permet de modifier la structure de la base de données sans perdre les données existantes. Chaque migration est versionnée et peut être appliquée ou annulée.

## 📦 Installation

Les migrations sont déjà configurées. Aucune installation supplémentaire n'est nécessaire.

## 🚀 Utilisation

### Voir le statut des migrations

```bash
cd backend
npm run migrate:status
```

Affiche :
- ✓ Migrations déjà exécutées
- ○ Migrations en attente

### Exécuter les migrations en attente

```bash
npm run migrate
```

Applique toutes les migrations qui n'ont pas encore été exécutées.

### Créer une nouvelle migration

```bash
npm run migrate:create nom_de_la_migration
```

Exemples :
```bash
npm run migrate:create add_phone_to_users
npm run migrate:create create_notifications_table
npm run migrate:create add_index_to_videos
```

Cela crée un fichier dans `src/database/migrations/` avec un timestamp et le nom fourni.

### Annuler la dernière migration (Rollback)

```bash
npm run migrate:rollback
```

⚠️ **Attention** : Utilisez avec précaution en production !

## 📝 Écrire une migration

Chaque migration doit exporter deux fonctions :

### Structure de base

```javascript
/**
 * Migration: Description de la migration
 * Created: Date
 */

module.exports = {
  async up(connection) {
    // Code pour appliquer les changements
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN phone VARCHAR(20) AFTER email
    `);
  },

  async down(connection) {
    // Code pour annuler les changements
    await connection.query(`
      ALTER TABLE users 
      DROP COLUMN phone
    `);
  }
};
```

## 📚 Exemples de migrations courantes

### 1. Ajouter une colonne

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

### 2. Modifier une colonne

```javascript
module.exports = {
  async up(connection) {
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN bio TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  },

  async down(connection) {
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN bio VARCHAR(500)
    `);
  }
};
```

### 3. Créer une nouvelle table

```javascript
module.exports = {
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        theme VARCHAR(20) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'fr',
        notifications_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },

  async down(connection) {
    await connection.query('DROP TABLE IF EXISTS user_preferences');
  }
};
```

### 4. Ajouter un index

```javascript
module.exports = {
  async up(connection) {
    await connection.query(`
      CREATE INDEX idx_videos_published_at ON videos(published_at)
    `);
  },

  async down(connection) {
    await connection.query(`
      DROP INDEX idx_videos_published_at ON videos
    `);
  }
};
```

### 5. Ajouter une clé étrangère

```javascript
module.exports = {
  async up(connection) {
    await connection.query(`
      ALTER TABLE comments 
      ADD CONSTRAINT fk_comments_video 
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    `);
  },

  async down(connection) {
    await connection.query(`
      ALTER TABLE comments 
      DROP FOREIGN KEY fk_comments_video
    `);
  }
};
```

### 6. Migration avec données (seed)

```javascript
module.exports = {
  async up(connection) {
    // Ajouter une colonne
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN country VARCHAR(2) DEFAULT 'BF'
    `);

    // Mettre à jour les données existantes
    await connection.query(`
      UPDATE users 
      SET country = 'BF' 
      WHERE country IS NULL
    `);
  },

  async down(connection) {
    await connection.query(`
      ALTER TABLE users 
      DROP COLUMN country
    `);
  }
};
```

### 7. Migration conditionnelle (vérifier si existe)

```javascript
module.exports = {
  async up(connection) {
    // Vérifier si la colonne existe déjà
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'phone'
    `);

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN phone VARCHAR(20)
      `);
      console.log('  ✓ Added phone column');
    } else {
      console.log('  ⚠ Phone column already exists, skipping');
    }
  },

  async down(connection) {
    await connection.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS phone
    `);
  }
};
```

## ✅ Bonnes pratiques

### 1. Nommage des migrations
- Utilisez des noms descriptifs : `add_phone_to_users`, `create_notifications_table`
- Le timestamp est ajouté automatiquement

### 2. Une migration = un changement logique
- Ne mélangez pas plusieurs changements non liés
- Gardez les migrations simples et ciblées

### 3. Testez toujours le rollback
- Assurez-vous que `down()` fonctionne correctement
- Testez sur une base de développement d'abord

### 4. Utilisez des transactions
Le système utilise automatiquement des transactions, mais pour des opérations complexes :

```javascript
module.exports = {
  async up(connection) {
    await connection.beginTransaction();
    try {
      await connection.query('...');
      await connection.query('...');
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
};
```

### 5. Documentez vos migrations
```javascript
/**
 * Migration: Add user preferences
 * Created: 2025-12-24
 * Description: Adds a preferences table to store user settings
 * Related: Issue #123
 */
```

### 6. Évitez de supprimer des données
- Préférez marquer comme "deleted" plutôt que supprimer
- Utilisez des colonnes `deleted_at` ou `is_deleted`

### 7. Gérez les valeurs par défaut
```javascript
ALTER TABLE users 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL
```

## 🔄 Workflow recommandé

### Développement
1. Créer une migration : `npm run migrate:create ma_migration`
2. Éditer le fichier créé dans `src/database/migrations/`
3. Tester : `npm run migrate`
4. Vérifier : `npm run migrate:status`
5. Si erreur : `npm run migrate:rollback` puis corriger

### Production
1. Faire un backup de la base de données
2. Tester les migrations sur une copie de la base
3. Exécuter : `npm run migrate`
4. Vérifier que tout fonctionne
5. En cas de problème : restaurer le backup

## 🛡️ Sécurité

### Avant de déployer en production
- ✅ Testez sur une base de développement
- ✅ Testez le rollback
- ✅ Faites un backup complet
- ✅ Vérifiez les index et performances
- ✅ Documentez les changements

### En production
- ⚠️ Exécutez pendant les heures creuses
- ⚠️ Surveillez les performances
- ⚠️ Ayez un plan de rollback
- ⚠️ Informez l'équipe

## 📊 Table de suivi

Le système crée automatiquement une table `migrations` qui contient :
- `id` : ID auto-incrémenté
- `name` : Nom du fichier de migration
- `executed_at` : Date d'exécution

Cette table permet de savoir quelles migrations ont été appliquées.

## 🐛 Dépannage

### Migration bloquée
```bash
# Voir le statut
npm run migrate:status

# Rollback de la dernière migration
npm run migrate:rollback

# Réessayer
npm run migrate
```

### Erreur de syntaxe SQL
Vérifiez votre SQL dans un client MySQL avant de l'ajouter à la migration.

### Migration déjà exécutée manuellement
Si vous avez modifié la base manuellement, ajoutez l'entrée dans la table `migrations` :
```sql
INSERT INTO migrations (name) VALUES ('nom_du_fichier.js');
```

## 📞 Support

Pour toute question ou problème, consultez :
- La documentation MySQL : https://dev.mysql.com/doc/
- Les logs d'erreur dans la console
- Le code source dans `src/database/migrationRunner.js`
