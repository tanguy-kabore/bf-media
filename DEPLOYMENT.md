# Déploiement BF Media sur OVH

## Prérequis

- VPS OVH avec Ubuntu 20.04+ ou Debian 11+
- Accès SSH root
- Nom de domaine configuré (DNS pointant vers le VPS)

## Déploiement rapide

```bash
# 1. Se connecter en SSH
ssh root@votre-ip-ovh

# 2. Télécharger et exécuter le script
curl -O https://raw.githubusercontent.com/votre-username/bf-media/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

## Déploiement manuel

### 1. Installation des dépendances

```bash
apt update && apt upgrade -y
apt install -y curl git nginx mysql-server

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2
```

### 2. Cloner le projet

```bash
cd /var/www
git clone https://github.com/votre-username/bf-media.git
cd bf-media
```

### 3. Configurer la base de données

```bash
mysql -u root -p
```

```sql
CREATE DATABASE bf_media CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bf_media_user'@'localhost' IDENTIFIED BY 'mot_de_passe_securise';
GRANT ALL PRIVILEGES ON bf_media.* TO 'bf_media_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Configurer l'environnement

```bash
cd /var/www/bf-media/backend
cp .env.example .env
nano .env
```

**Variables importantes à modifier :**

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | Mot de passe MySQL |
| `JWT_SECRET` | Secret JWT (générer avec `openssl rand -base64 32`) |
| `CONTENT_ENCRYPTION_KEY` | Clé 32 caractères pour le contenu |
| `DRM_SECRET_KEY` | Clé 32 caractères pour le DRM |
| `FRONTEND_URL` | URL de votre domaine (https://...) |

### 5. Installer les dépendances et build

```bash
cd /var/www/bf-media
npm install

cd frontend
npm run build
```

### 6. Configurer Nginx

```bash
nano /etc/nginx/sites-available/bf-media
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    # Frontend
    location / {
        root /var/www/bf-media/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 2G;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/bf-media/backend/uploads/;
        expires 30d;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/bf-media /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 7. Démarrer l'application

```bash
cd /var/www/bf-media/backend
pm2 start src/index.js --name "bf-media-api"
pm2 save
pm2 startup
```

### 8. SSL avec Let's Encrypt

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `pm2 status` | Voir le statut de l'application |
| `pm2 logs` | Voir les logs en temps réel |
| `pm2 restart bf-media-api` | Redémarrer l'API |
| `pm2 monit` | Monitorer l'application |
| `systemctl status nginx` | Statut de Nginx |

## Mise à jour

```bash
cd /var/www/bf-media
git pull origin main
npm install
cd frontend && npm run build
pm2 restart bf-media-api
```

## Sécurité

### Firewall (UFW)

```bash
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

### Sauvegardes automatiques

```bash
# Créer un script de backup
nano /root/backup-bf-media.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup base de données
mysqldump -u bf_media_user -p'votre_mdp' bf_media > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/bf-media/backend/uploads

# Garder uniquement les 7 derniers jours
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
chmod +x /root/backup-bf-media.sh
crontab -e
# Ajouter: 0 2 * * * /root/backup-bf-media.sh
```

## Dépannage

### L'API ne répond pas
```bash
pm2 logs bf-media-api --lines 50
```

### Erreur de connexion MySQL
```bash
mysql -u bf_media_user -p bf_media
```

### Nginx erreur 502
```bash
# Vérifier que l'API tourne
pm2 status
# Vérifier les logs Nginx
tail -f /var/log/nginx/error.log
```
