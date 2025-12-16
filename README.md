# 🎬 BF Media - Plateforme de Streaming Vidéo

Une plateforme de streaming vidéo complète développée avec Node.js/Express, React et MySQL.

## ✨ Fonctionnalités

### 📹 Hébergement & Gestion des Médias
- Upload de vidéos (jusqu'à 2 Go)
- Génération automatique de miniatures
- Gestion des métadonnées (titres, descriptions, tags)
- Organisation par chaînes et catégories
- Support multi-formats (MP4, WebM, MOV, AVI, MKV)

### 🎥 Lecture & Accessibilité
- Lecteur vidéo HTML5 personnalisé
- Streaming adaptatif (HLS ready)
- Support des différentes qualités vidéo
- Interface responsive (web, mobile, tablette)

### 💬 Interaction & Communauté
- Système de commentaires avec réponses
- Likes/Dislikes sur vidéos et commentaires
- Système d'abonnements aux chaînes
- Notifications en temps réel (Socket.io)
- Partage de vidéos

### 🔍 Découverte & Recommandations
- Moteur de recherche avancé avec filtres
- Recherche full-text sur titres et descriptions
- Vidéos suggérées basées sur le contenu
- Catégories et tags pour la découverte
- Tendances et contenus populaires

### 📊 Analytics & Reporting
- Tableau de bord créateur (Studio)
- Statistiques de vues et engagement
- Données démographiques des spectateurs
- Suivi des performances par vidéo
- Analytics en temps réel

### 🔒 Sécurité & Permissions
- Authentification JWT sécurisée
- Contrôle de visibilité (public, privé, non répertorié)
- Protection contre les abus (rate limiting)
- Système de signalement de contenu
- Content ID pour la gestion des droits d'auteur

## 🛠️ Technologies

### Backend
- **Node.js** + **Express.js** - API REST
- **MySQL** - Base de données
- **Socket.io** - Communications temps réel
- **FFmpeg** - Traitement vidéo
- **JWT** - Authentification
- **Multer** - Upload de fichiers

### Frontend
- **React 18** - Interface utilisateur
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Recharts** - Graphiques analytics
- **Socket.io Client** - Temps réel

## 📁 Structure du Projet

```
bf-media/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration DB
│   │   ├── database/       # Migrations
│   │   ├── middleware/     # Auth, upload, errors
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Logique métier
│   │   └── server.js       # Point d'entrée
│   ├── uploads/            # Fichiers uploadés
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Composants React
│   │   ├── pages/          # Pages de l'app
│   │   ├── services/       # API client
│   │   ├── store/          # State Zustand
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## 🚀 Installation

### Prérequis
- Node.js 18+
- MySQL 8+
- FFmpeg (pour le traitement vidéo)

### 1. Cloner le projet
```bash
cd C:\Users\HP\CascadeProjects\bf-media
```

### 2. Configurer la base de données
Créez une base de données MySQL et configurez le fichier `.env` dans le dossier `backend/`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=bf_media
JWT_SECRET=votre_secret_jwt
```

### 3. Installer les dépendances
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Initialiser la base de données
```bash
cd backend
npm run db:migrate
```

### 5. Lancer l'application
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

L'application sera accessible sur:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📡 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `POST /api/auth/change-password` - Changer mot de passe

### Vidéos
- `GET /api/videos` - Liste des vidéos
- `GET /api/videos/:id` - Détails d'une vidéo
- `POST /api/videos/upload` - Uploader une vidéo
- `PUT /api/videos/:id` - Modifier une vidéo
- `DELETE /api/videos/:id` - Supprimer une vidéo
- `POST /api/videos/:id/react` - Like/Dislike
- `POST /api/videos/:id/view` - Enregistrer une vue

### Chaînes
- `GET /api/channels/:handle` - Profil de chaîne
- `GET /api/channels/:handle/videos` - Vidéos de la chaîne
- `PUT /api/channels/:handle` - Modifier la chaîne

### Commentaires
- `GET /api/comments/video/:videoId` - Commentaires d'une vidéo
- `POST /api/comments/video/:videoId` - Ajouter un commentaire
- `POST /api/comments/:id/react` - Like/Dislike commentaire

### Abonnements
- `POST /api/subscriptions/:channelId` - S'abonner
- `DELETE /api/subscriptions/:channelId` - Se désabonner
- `GET /api/subscriptions/feed` - Feed des abonnements

### Recherche
- `GET /api/search?q=query` - Rechercher

### Analytics
- `GET /api/analytics/channel` - Analytics de la chaîne
- `GET /api/analytics/video/:videoId` - Analytics d'une vidéo

## 🎨 Pages de l'Application

- **Accueil** - Fil de vidéos avec filtres par catégorie
- **Watch** - Lecteur vidéo avec commentaires et suggestions
- **Channel** - Profil de chaîne avec vidéos
- **Search** - Recherche avec filtres avancés
- **Upload** - Upload de nouvelles vidéos
- **Studio** - Dashboard créateur avec analytics
- **Subscriptions** - Vidéos des chaînes suivies
- **History** - Historique de visionnage
- **Settings** - Paramètres du compte

## 🔐 Sécurité

- Authentification par JWT avec refresh tokens
- Hachage des mots de passe avec bcrypt
- Rate limiting sur les endpoints API
- Validation des entrées utilisateur
- Protection CORS configurée
- Headers de sécurité avec Helmet

## 📝 License

MIT License - Libre d'utilisation et de modification.

---

Développé avec ❤️ pour BF Media
