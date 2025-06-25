# TorriApps PWA Client

A Progressive Web App (PWA) client for TorriApps salon booking system.

## 🚀 Features

- ✅ **Login Screen** - Migrated from React Native
- 📱 **PWA Ready** - Installable on mobile devices
- 🎨 **Mobile-First Design** - Optimized for mobile experience
- ⚡ **Fast & Offline** - Service worker caching
- 🔄 **Auto Updates** - No app store required

## 🛠 Tech Stack

- **React 18** - UI Framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Query** - Server state management
- **React Router** - Navigation
- **Vite PWA Plugin** - PWA features

## 🔧 Development

### Prerequisites

- Node.js 18+ 
- Backend running on localhost:8000

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 📱 PWA Installation

### Mobile Browsers
1. Open the app in browser
2. Look for "Add to Home Screen" prompt
3. Follow installation steps

### Desktop Browsers
1. Look for install icon in address bar
2. Click to install as desktop app

## 🚀 Deployment

The PWA can be deployed to any static hosting service:

- **Vercel** (recommended)
- **Netlify** 
- **Firebase Hosting**
- **GitHub Pages**

Build command: `npm run build`
Output directory: `dist`

## 📋 Migration Progress

### ✅ Completed
- [x] PWA setup & configuration
- [x] Login screen migration
- [x] Auth state management
- [x] API integration

### 🔄 In Progress
- [ ] Categories screen
- [ ] Services screen  
- [ ] Appointment booking

### 📅 Planned
- [ ] User profile
- [ ] Appointment history
- [ ] Push notifications
- [ ] Offline support

## 🏗 Architecture

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── stores/        # Zustand stores
├── services/      # API services
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
└── assets/        # Static assets
```

## 🎯 Benefits over Native App

- **Instant Updates** - No app store approval needed
- **Easy Deployment** - Simple static hosting
- **Cross Platform** - Works on iOS & Android
- **Lower Maintenance** - Single codebase
- **Better SEO** - Web indexable content

## 🔗 Related

- Backend API: `../Backend/`
- Web Admin: `../Web-admin/`
- Mobile Core: `../Mobile-client-core/` (legacy)