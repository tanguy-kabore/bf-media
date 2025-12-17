#!/bin/bash

# ============================================
# BF Media - Script de déploiement pour OVH
# ============================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   BF Media - Déploiement OVH${NC}"
echo -e "${GREEN}========================================${NC}"

# Configuration
APP_DIR="/var/www/bf-media"
REPO_URL="https://github.com/votre-username/bf-media.git"  # À modifier
BRANCH="main"

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Veuillez exécuter ce script en tant que root (sudo)${NC}"
  exit 1
fi

# ============================================
# 1. Installation des dépendances système
# ============================================
echo -e "${YELLOW}[1/7] Installation des dépendances système...${NC}"

apt-get update
apt-get install -y curl git nginx mysql-server

# Installer Node.js 20.x
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Installer PM2 globalement
npm install -g pm2

echo -e "${GREEN}✓ Dépendances système installées${NC}"

# ============================================
# 2. Cloner ou mettre à jour le repository
# ============================================
echo -e "${YELLOW}[2/7] Mise à jour du code source...${NC}"

if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/$BRANCH
else
  git clone -b $BRANCH $REPO_URL $APP_DIR
  cd "$APP_DIR"
fi

echo -e "${GREEN}✓ Code source mis à jour${NC}"

# ============================================
# 3. Configuration des variables d'environnement
# ============================================
echo -e "${YELLOW}[3/7] Configuration de l'environnement...${NC}"

if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo -e "${YELLOW}Création du fichier .env backend...${NC}"
  
  # Générer des secrets aléatoires
  JWT_SECRET=$(openssl rand -base64 32)
  CONTENT_KEY=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  DRM_KEY=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  
  cat > "$APP_DIR/backend/.env" << EOF
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=bf_media_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE_DB
DB_NAME=bf_media

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=2147483648
ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo

# Streaming Configuration
STREAMING_CHUNK_SIZE=1048576
HLS_SEGMENT_DURATION=10

# Encryption Keys
CONTENT_ENCRYPTION_KEY=$CONTENT_KEY
DRM_SECRET_KEY=$DRM_KEY

# Frontend URL (for CORS)
FRONTEND_URL=https://votre-domaine.com

# Analytics
ANALYTICS_ENABLED=true
EOF

  echo -e "${RED}⚠ IMPORTANT: Modifiez $APP_DIR/backend/.env avec vos vraies valeurs !${NC}"
  echo -e "${RED}  - DB_PASSWORD${NC}"
  echo -e "${RED}  - FRONTEND_URL${NC}"
fi

echo -e "${GREEN}✓ Environnement configuré${NC}"

# ============================================
# 4. Installation des dépendances Node.js
# ============================================
echo -e "${YELLOW}[4/7] Installation des dépendances Node.js...${NC}"

cd "$APP_DIR"
npm install

echo -e "${GREEN}✓ Dépendances installées${NC}"

# ============================================
# 5. Build du frontend
# ============================================
echo -e "${YELLOW}[5/7] Build du frontend...${NC}"

cd "$APP_DIR/frontend"
npm run build

echo -e "${GREEN}✓ Frontend compilé${NC}"

# ============================================
# 6. Configuration Nginx
# ============================================
echo -e "${YELLOW}[6/7] Configuration de Nginx...${NC}"

cat > /etc/nginx/sites-available/bf-media << 'EOF'
server {
    listen 80;
    server_name YOUR_SERVER_NAME;

    # ACME challenge (Let’s Encrypt)
    location ^~ /.well-known/acme-challenge/ {
        alias /var/lib/letsencrypt/.well-known/acme-challenge/;
        allow all;
        default_type "text/plain";
    }

    # Frontend (React / SPA)
    location / {
        root /var/www/bf-media/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:5000;
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
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/bf-media /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger Nginx
nginx -t && systemctl reload nginx

echo -e "${GREEN}✓ Nginx configuré${NC}"

# ============================================
# 7. Démarrer l'application avec PM2
# ============================================
echo -e "${YELLOW}[7/7] Démarrage de l'application...${NC}"

cd "$APP_DIR/backend"

# Arrêter l'ancienne instance si elle existe
pm2 delete bf-media-api 2>/dev/null || true

# Démarrer avec PM2
pm2 start src/server.js --name "bf-media-api" --env production

# Sauvegarder la config PM2 pour le démarrage automatique
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}✓ Application démarrée${NC}"

# ============================================
# Résumé
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Déploiement terminé !${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Actions restantes :"
echo -e "  1. ${YELLOW}Modifier /var/www/bf-media/backend/.env${NC}"
echo -e "     - DB_PASSWORD"
echo -e "     - FRONTEND_URL (votre domaine)"
echo -e ""
echo -e "  2. ${YELLOW}Modifier /etc/nginx/sites-available/bf-media${NC}"
echo -e "     - server_name (votre domaine)"
echo -e ""
echo -e "  3. ${YELLOW}Configurer la base de données MySQL${NC}"
echo -e "     mysql -u root -p"
echo -e "     CREATE DATABASE bf_media;"
echo -e "     CREATE USER 'bf_media_user'@'localhost' IDENTIFIED BY 'votre_mdp';"
echo -e "     GRANT ALL PRIVILEGES ON bf_media.* TO 'bf_media_user'@'localhost';"
echo -e "     FLUSH PRIVILEGES;"
echo -e ""
echo -e "  4. ${YELLOW}Installer SSL avec Let's Encrypt${NC}"
echo -e "     apt install certbot python3-certbot-nginx"
echo -e "     certbot --nginx -d votre-domaine.com"
echo ""
echo -e "Commandes utiles :"
echo -e "  pm2 status          - Voir le statut de l'app"
echo -e "  pm2 logs            - Voir les logs"
echo -e "  pm2 restart all     - Redémarrer l'app"
echo ""
