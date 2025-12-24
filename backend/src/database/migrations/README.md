# Système de Migrations de Base de Données

## Vue d'ensemble

Ce système permet d'ajouter des champs, modifier des tables ou créer de nouvelles tables sans perdre les données existantes.

## Structure

```
migrations/
├── README.md (ce fichier)
├── 001_initial_schema.js
├── 002_add_settings_table.js
├── 003_add_analytics_columns.js
└── ...
```

## Utilisation

### Exécuter toutes les migrations en attente
```bash
npm run migrate
```

### Créer une nouvelle migration
```bash
npm run migrate:create nom_de_la_migration
```

### Voir le statut des migrations
```bash
npm run migrate:status
```

### Rollback de la dernière migration
```bash
npm run migrate:rollback
```

## Format d'une migration

Chaque fichier de migration doit exporter deux fonctions :
- `up()` : Applique les changements
- `down()` : Annule les changements (rollback)

Exemple :
```javascript
module.exports = {
  async up(connection) {
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN phone VARCHAR(20) AFTER email
    `);
  },

  async down(connection) {
    await connection.query(`
      ALTER TABLE users 
      DROP COLUMN phone
    `);
  }
};
```

## Bonnes pratiques

1. **Nommage** : Utilisez des noms descriptifs (ex: `add_phone_to_users`, `create_notifications_table`)
2. **Atomicité** : Une migration = un changement logique
3. **Testez le rollback** : Assurez-vous que `down()` fonctionne
4. **Pas de suppression de données** : Utilisez des migrations pour ajouter, pas supprimer
5. **Commentaires** : Documentez les changements complexes

## Exemples de migrations courantes

### Ajouter une colonne
```javascript
ALTER TABLE table_name ADD COLUMN column_name TYPE
```

### Modifier une colonne
```javascript
ALTER TABLE table_name MODIFY COLUMN column_name NEW_TYPE
```

### Créer un index
```javascript
CREATE INDEX idx_name ON table_name(column_name)
```

### Créer une table
```javascript
CREATE TABLE IF NOT EXISTS table_name (...)
```

### Ajouter une clé étrangère
```javascript
ALTER TABLE table_name 
ADD CONSTRAINT fk_name 
FOREIGN KEY (column) REFERENCES other_table(id)
```
