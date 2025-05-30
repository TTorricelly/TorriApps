#!/bin/bash

# Project Structure Generator Script for macOS
# This script creates the complete folder structure for your application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create directories
create_dir() {
    local dir_path="$1"
    if [ ! -d "$dir_path" ]; then
        mkdir -p "$dir_path"
        print_status "Created directory: $dir_path"
    else
        print_warning "Directory already exists: $dir_path"
    fi
}

# Function to create files
create_file() {
    local file_path="$1"
    local content="$2"
    
    # Create directory if it doesn't exist
    local dir_path=$(dirname "$file_path")
    create_dir "$dir_path"
    
    if [ ! -f "$file_path" ]; then
        echo "$content" > "$file_path"
        print_status "Created file: $file_path"
    else
        print_warning "File already exists: $file_path"
    fi
}

# Get project name from user
read -p "Enter your project name (default: salon-management-system): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-salon-management-system}

# Create project root directory
print_status "Creating project structure for: $PROJECT_NAME"
create_dir "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Root files
create_file "README.md" "# $PROJECT_NAME

This is a multi-tenant salon management system with web admin panel and mobile applications.

## Structure
- Backend: Python FastAPI backend
- Web-admin: React.js admin panel
- Mobile-client-core: React Native core app
- Mobile-client-configs: White-label configurations
- Mobile-admin: Mobile admin app
- Infrastructure: Deployment configurations
"

create_file ".gitignore" "# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.egg-info/

# Environment files
.env
.env.local
.env.production

# Build outputs
build/
dist/
*.apk
*.ipa

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Database
*.db
*.sqlite3
"

create_file ".env.example" "# Environment variables template
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SECRET_KEY=your-secret-key-here
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1
"

# Backend structure
print_status "Creating Backend structure..."

create_file "Backend/Requirements.txt" "fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
pydantic==2.5.0
python-jose==3.3.0
passlib==1.7.4
python-multipart==0.0.6
psycopg2-binary==2.9.9
redis==5.0.1
celery==5.3.4
"

create_file "Backend/Requirements-dev.txt" "pytest==7.4.3
pytest-asyncio==0.21.1
black==23.11.0
flake8==6.1.0
mypy==1.7.1
pre-commit==3.5.0
"

create_file "Backend/.env.example" "DATABASE_URL=postgresql://user:password@localhost:5432/salon_db
SECRET_KEY=your-backend-secret-key
DEBUG=true
REDIS_URL=redis://localhost:6379/0
"

# Backend Config
create_file "Backend/Config/__init__.py" ""
create_file "Backend/Config/Settings.py" "from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False
    
    class Config:
        env_file = '.env'

settings = Settings()
"

create_file "Backend/Config/Database.py" "from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .Settings import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
"

# Backend Core
create_file "Backend/Core/__init__.py" ""

# Auth module
create_file "Backend/Core/Auth/__init__.py" ""
create_file "Backend/Core/Auth/models.py" "from sqlalchemy import Column, Integer, String, Boolean, DateTime
from ..Database.base import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
"

create_file "Backend/Core/Auth/Schemas.py" "from pydantic import BaseModel

class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True
"

create_file "Backend/Core/Auth/Routes.py" "from fastapi import APIRouter, Depends
from . import services, Schemas

router = APIRouter(prefix='/auth', tags=['auth'])

@router.post('/register', response_model=Schemas.User)
def register(user: Schemas.UserCreate):
    return services.create_user(user)
"

create_file "Backend/Core/Auth/services.py" "from . import models, Schemas

def create_user(user_data: Schemas.UserCreate):
    # Implementation for user creation
    pass
"

# Database core
create_file "Backend/Core/Database/__init__.py" ""
create_file "Backend/Core/Database/base.py" "from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
"

create_file "Backend/Core/Database/session.py" "from sqlalchemy.orm import Session
from ...Config.Database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"

# Utils
create_file "Backend/Core/Utils/__init__.py" ""
create_file "Backend/Core/Utils/Helpers.py" "from datetime import datetime

def get_current_timestamp():
    return datetime.utcnow()
"

create_file "Backend/Core/Utils/Exceptions.py" "class CustomException(Exception):
    pass
"

# Backend Modules
modules=("Tenants" "white_label" "Users" "Appointments" "Services" "Employees" "Clients" "Payments" "Inventory" "Notifications")
create_file "Backend/Modules/__init__.py" ""

for module in "${modules[@]}"; do
    create_file "Backend/Modules/$module/__init__.py" ""
done

# Migrations and Tests
create_dir "Backend/Migrations/Versions"
create_dir "Backend/Tests/test_auth"
create_dir "Backend/Tests/test_users"
create_dir "Backend/Tests/test_appointments"
create_dir "Backend/Tests/test_services"

create_file "Backend/Scripts/seed_data.py" "#!/usr/bin/env python3
# Seed data script
print('Seeding database...')
"

# Web Admin structure
print_status "Creating Web-admin structure..."

create_dir "Web-admin/Public"
create_dir "Web-admin/Build"

# Components
components=("Common/Header" "Common/Sidebar" "Common/Footer" "Common/Layout" "Forms" "Tables" "Charts")
for comp in "${components[@]}"; do
    create_dir "Web-admin/Src/Components/$comp"
done

# Pages
pages=("Dashboard" "Appointments" "Clients" "Employees" "Services" "Payments" "Inventory" "Reports" "Settings")
for page in "${pages[@]}"; do
    create_dir "Web-admin/Src/Pages/$page"
done

create_dir "Web-admin/Src/Hooks"

# Services
create_file "Web-admin/Src/Services/api.js" "const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiClient = {
  get: (endpoint) => fetch(\`\${API_BASE_URL}\${endpoint}\`),
  post: (endpoint, data) => fetch(\`\${API_BASE_URL}\${endpoint}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
};
"

create_file "Web-admin/Src/Services/auth.js" "export const authService = {
  login: (credentials) => {
    // Login implementation
  },
  logout: () => {
    // Logout implementation
  }
};
"

create_file "Web-admin/Src/Services/Endpoints.js" "export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register'
  },
  USERS: '/users',
  APPOINTMENTS: '/appointments'
};
"

# Context
create_file "Web-admin/Src/Context/authcontext.js" "import React, { createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
};
"

create_file "Web-admin/Src/Context/ThemeContext.js" "import React, { createContext, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);
"

# Utils
create_file "Web-admin/Src/Utils/Helpers.js" "export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};
"

create_file "Web-admin/Src/Utils/Constants.js" "export const CONSTANTS = {
  APP_NAME: 'Salon Management System',
  API_TIMEOUT: 5000
};
"

create_file "Web-admin/Src/Utils/Validators.js" "export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
"

# Styles
create_file "Web-admin/Src/Styles/Globals.css" "/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
"

create_dir "Web-admin/Src/Styles/Components"
create_dir "Web-admin/Src/Assets/Images"
create_dir "Web-admin/Src/Assets/Icons"

# Tests
create_dir "Web-admin/Tests/Components"
create_dir "Web-admin/Tests/Pages"

# Mobile Client Core structure
print_status "Creating Mobile-client-core structure..."

# Android
create_dir "Mobile-client-core/Android/App/Src/Main/Res/Mipmap-hdpi"
create_dir "Mobile-client-core/Android/App/Src/Main/Res/Mipmap-mdpi"
create_dir "Mobile-client-core/Android/App/Src/Main/Res/Mipmap-xhdpi"
create_dir "Mobile-client-core/Android/App/Src/Main/Res/Mipmap-xxhdpi"
create_dir "Mobile-client-core/Android/App/Src/Main/Res/Mipmap-xxxhdpi"

create_file "Mobile-client-core/Android/App/Src/Main/Res/Values/Colors.xml.template" "<?xml version=\"1.0\" encoding=\"utf-8\"?>
<resources>
    <color name=\"primary\">{{PRIMARY_COLOR}}</color>
    <color name=\"background\">{{BACKGROUND_COLOR}}</color>
</resources>
"

create_file "Mobile-client-core/Android/App/Src/Main/Res/Values/strings.xml.template" "<?xml version=\"1.0\" encoding=\"utf-8\"?>
<resources>
    <string name=\"app_name\">{{APP_NAME}}</string>
</resources>
"

create_file "Mobile-client-core/Android/App/Src/Main/Res/Values/styles.xml.template" "<?xml version=\"1.0\" encoding=\"utf-8\"?>
<resources>
    <style name=\"AppTheme\" parent=\"Theme.AppCompat.Light\">
        <item name=\"colorPrimary\">{{PRIMARY_COLOR}}</item>
    </style>
</resources>
"

create_file "Mobile-client-core/Android/App/Src/Main/AndroidMainManifest.xml.template" "<?xml version=\"1.0\" encoding=\"utf-8\"?>
<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">
    <application
        android:name=\"{{PACKAGE_NAME}}.MainApplication\"
        android:label=\"{{APP_NAME}}\">
    </application>
</manifest>
"

create_file "Mobile-client-core/Android/App/build.gradle.template" "android {
    compileSdkVersion {{COMPILE_SDK_VERSION}}
    defaultConfig {
        applicationId \"{{PACKAGE_NAME}}\"
        minSdkVersion {{MIN_SDK_VERSION}}
        targetSdkVersion {{TARGET_SDK_VERSION}}
        versionCode {{VERSION_CODE}}
        versionName \"{{VERSION_NAME}}\"
    }
}
"

# iOS
create_dir "Mobile-client-core/iOS/Images.xcassets/App.icon.appiconset"
create_file "Mobile-client-core/iOS/LaunchScreen.storyboard.template" "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<document type=\"com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB\">
    <!-- Launch screen template -->
</document>
"

# React Native Source
create_file "Mobile-client-core/Src/App.js" "import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './Navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
"

# Components
mobile_components=("Common/Header" "Common/Button" "Common/Input" "Common/Card" "Forms" "Lists")
for comp in "${mobile_components[@]}"; do
    create_dir "Mobile-client-core/Src/Components/$comp"
done

# Screens
create_file "Mobile-client-core/Src/Screens/Auth/login.js" "import React from 'react';
import { View, Text } from 'react-native';

export default function LoginScreen() {
  return (
    <View>
      <Text>Login Screen</Text>
    </View>
  );
}
"

create_file "Mobile-client-core/Src/Screens/Auth/register.js" "import React from 'react';
import { View, Text } from 'react-native';

export default function RegisterScreen() {
  return (
    <View>
      <Text>Register Screen</Text>
    </View>
  );
}
"

create_dir "Mobile-client-core/Src/Screens/Home"
create_file "Mobile-client-core/Src/Screens/Appointments/BookAppointment.js" "import React from 'react';
import { View, Text } from 'react-native';

export default function BookAppointmentScreen() {
  return (
    <View>
      <Text>Book Appointment</Text>
    </View>
  );
}
"

create_file "Mobile-client-core/Src/Screens/Appointments/AppointmentHistory.js" "import React from 'react';
import { View, Text } from 'react-native';

export default function AppointmentHistoryScreen() {
  return (
    <View>
      <Text>Appointment History</Text>
    </View>
  );
}
"

create_file "Mobile-client-core/Src/Screens/Appointments/AppointmentDetails.js" "import React from 'react';
import { View, Text } from 'react-native';

export default function AppointmentDetailsScreen() {
  return (
    <View>
      <Text>Appointment Details</Text>
    </View>
  );
}
"

create_dir "Mobile-client-core/Src/Screens/Services"
create_dir "Mobile-client-core/Src/Screens/Profile"
create_dir "Mobile-client-core/Src/Screens/Notifications"

# Navigation
create_file "Mobile-client-core/Src/Navigation/AppNavigator.js" "import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../Screens/Auth/login';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=\"Login\" component={LoginScreen} />
    </Stack.Navigator>
  );
}
"

create_file "Mobile-client-core/Src/Navigation/AuthNavigator.js" "import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator>
      {/* Auth screens */}
    </Stack.Navigator>
  );
}
"

create_file "Mobile-client-core/Src/Navigation/TabNavigator.js" "import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator>
      {/* Tab screens */}
    </Tab.Navigator>
  );
}
"

# Services
create_file "Mobile-client-core/Src/Services/api.js" "const API_BASE_URL = 'https://api.example.com';

export const apiService = {
  get: async (endpoint) => {
    const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`);
    return response.json();
  }
};
"

create_file "Mobile-client-core/Src/Services/auth.js" "export const authService = {
  login: async (credentials) => {
    // Login implementation
  }
};
"

create_file "Mobile-client-core/Src/Services/storage.js" "import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  setItem: (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)),
  getItem: async (key) => {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }
};
"

# Context
create_file "Mobile-client-core/Src/Context/AuthContext.js" "import React, { createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);
"

create_file "Mobile-client-core/Src/Context/ThemeContext.js" "import React, { createContext, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);
"

create_file "Mobile-client-core/Src/Context/ConfigContext.js" "import React, { createContext, useContext } from 'react';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);
"

# Hooks
create_file "Mobile-client-core/Src/Hooks/useTheme.js" "import { useContext } from 'react';
import { ThemeContext } from '../Context/ThemeContext';

export const useTheme = () => {
  return useContext(ThemeContext);
};
"

create_file "Mobile-client-core/Src/Hooks/useConfig.js" "import { useContext } from 'react';
import { ConfigContext } from '../Context/ConfigContext';

export const useConfig = () => {
  return useContext(ConfigContext);
};
"

# Utils
create_file "Mobile-client-core/Src/Utils/Helpers.js" "export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};
"

create_file "Mobile-client-core/Src/Utils/constants.js" "export const CONSTANTS = {
  API_TIMEOUT: 5000,
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data'
  }
};
"

create_file "Mobile-client-core/Src/Utils/validators.js" "export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
"

create_file "Mobile-client-core/Src/Utils/configLoader.js" "export const loadConfig = (brandConfig) => {
  // Load brand-specific configuration
  return {
    ...brandConfig,
    apiUrl: brandConfig.apiUrl || 'https://api.default.com'
  };
};
"

# Theming
create_file "Mobile-client-core/Src/Theming/ThemeProvider.js" "import React from 'react';
import { ThemeContext } from '../Context/ThemeContext';

export const ThemeProvider = ({ children, theme }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
"

create_file "Mobile-client-core/Src/Theming/defaultTheme.js" "export const defaultTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    text: '#000000'
  },
  fonts: {
    regular: 'System',
    bold: 'System-Bold'
  }
};
"

create_file "Mobile-client-core/Src/Theming/createTheme.js" "import { defaultTheme } from './defaultTheme';

export const createTheme = (customTheme = {}) => {
  return {
    ...defaultTheme,
    ...customTheme,
    colors: {
      ...defaultTheme.colors,
      ...customTheme.colors
    }
  };
};
"

# Assets
create_dir "Mobile-client-core/Src/Assets/Images/Default"
create_dir "Mobile-client-core/Src/Assets/Icons/Default"
create_dir "Mobile-client-core/Src/Assets/Fonts/Default"

# Tests and Scripts
create_dir "Mobile-client-core/__tests__"

create_file "Mobile-client-core/Scripts/Build-whitelabel.js" "#!/usr/bin/env node
// Build script for white-label apps
console.log('Building white-label application...');
"

create_file "Mobile-client-core/Scripts/Generate-configs.js" "#!/usr/bin/env node
// Generate configuration files
console.log('Generating configuration files...');
"

create_file "Mobile-client-core/Scripts/Update-assets.js" "#!/usr/bin/env node
// Update assets for different brands
console.log('Updating assets...');
"

create_file "Mobile-client-core/Scripts/Deploy-apps.js" "#!/usr/bin/env node
// Deploy applications
console.log('Deploying applications...');
"

# Templates
create_file "Mobile-client-core/Templates/app.json.template" "{
  \"name\": \"{{APP_NAME}}\",
  \"displayName\": \"{{DISPLAY_NAME}}\",
  \"version\": \"{{VERSION}}\",
  \"bundleId\": \"{{BUNDLE_ID}}\"
}
"

create_file "Mobile-client-core/Templates/Package.json.template" "{
  \"name\": \"{{PACKAGE_NAME}}\",
  \"version\": \"{{VERSION}}\",
  \"description\": \"{{DESCRIPTION}}\",
  \"main\": \"index.js\"
}
"

create_file "Mobile-client-core/Templates/.env.template" "API_URL={{API_URL}}
APP_NAME={{APP_NAME}}
ENVIRONMENT={{ENVIRONMENT}}
"

# Mobile Client Configs
print_status "Creating Mobile-client-configs structure..."

# Function to convert string to lowercase
to_lowercase() {
    echo "$1" | tr '[:upper:]' '[:lower:]'
}

# Function to replace dashes with spaces
replace_dashes() {
    echo "$1" | sed 's/-/ /g'
}

# Brand configurations
brands=("Luxe-salon" "Beauty-hub" "Glamour-studio" "Urban-salon")
for brand in "${brands[@]}"; do
    brand_lower=$(to_lowercase "$brand")
    brand_display=$(replace_dashes "$brand")
    
    create_file "Mobile-client-configs/Brands/$brand/config.json" "{
  \"appName\": \"$brand\",
  \"packageName\": \"com.salon.$brand_lower\",
  \"displayName\": \"$brand_display\",
  \"version\": \"1.0.0\",
  \"apiUrl\": \"https://api.$brand_lower.com\"
}
"

    create_file "Mobile-client-configs/Brands/$brand/theme.json" "{
  \"colors\": {
    \"primary\": \"#007AFF\",
    \"secondary\": \"#5856D6\",
    \"background\": \"#FFFFFF\",
    \"text\": \"#000000\"
  },
  \"fonts\": {
    \"regular\": \"System\",
    \"bold\": \"System-Bold\"
  }
}
"

    # Assets directories
    create_dir "Mobile-client-configs/Brands/$brand/Assets/Images"
    create_dir "Mobile-client-configs/Brands/$brand/Assets/Icons/Android/Mipmap-hdpi"
    create_dir "Mobile-client-configs/Brands/$brand/Assets/Icons/iOS/AppIcon.appiconset"
    create_dir "Mobile-client-configs/Brands/$brand/Assets/Fonts"

    # Store configs
    create_file "Mobile-client-configs/Brands/$brand/Store-config/App-store-connect.json" "{
  \"appName\": \"$brand_display\",
  \"description\": \"Professional salon management app\",
  \"keywords\": \"salon, beauty, appointments\",
  \"category\": \"Business\"
}
"

    create_file "Mobile-client-configs/Brands/$brand/Store-config/Google-play-console.json" "{
  \"appName\": \"$brand_display\",
  \"shortDescription\": \"Professional salon management\",
  \"fullDescription\": \"Complete salon management solution\",
  \"category\": \"BUSINESS\"
}
"

    # Build configs
    create_file "Mobile-client-configs/Brands/$brand/Build-config/android.json" "{
  \"compileSdkVersion\": 34,
  \"minSdkVersion\": 21,
  \"targetSdkVersion\": 34,
  \"versionCode\": 1,
  \"versionName\": \"1.0.0\"
}
"

    create_file "Mobile-client-configs/Brands/$brand/Build-config/ios.json" "{
  \"iosDeploymentTarget\": \"12.0\",
  \"bundleId\": \"com.salon.$brand_lower\",
  \"teamId\": \"YOUR_TEAM_ID\"
}
"
done

# Templates and Shared configs
create_file "Mobile-client-configs/templates/app.json.template" "{
  \"name\": \"{{APP_NAME}}\",
  \"displayName\": \"{{DISPLAY_NAME}}\",
  \"version\": \"{{VERSION}}\"
}
"

create_file "Mobile-client-configs/templates/Package.json.template" "{
  \"name\": \"{{PACKAGE_NAME}}\",
  \"version\": \"{{VERSION}}\"
}
"

create_file "Mobile-client-configs/templates/Build-config.template" "{
  \"android\": {{ANDROID_CONFIG}},
  \"ios\": {{IOS_CONFIG}}
}
"

create_file "Mobile-client-configs/Shared/Base-config.json" "{
  \"defaultApiTimeout\": 5000,
  \"supportedLanguages\": [\"en\", \"es\", \"fr\"],
  \"features\": {
    \"appointments\": true,
    \"payments\": true,
    \"notifications\": true
  }
}
"

create_file "Mobile-client-configs/Shared/Base-theme.json" "{
  \"spacing\": {
    \"xs\": 4,
    \"sm\": 8,
    \"md\": 16,
    \"lg\": 24,
    \"xl\": 32
  },
  \"borderRadius\": {
    \"sm\": 4,
    \"md\": 8,
    \"lg\": 12
  }
}
"

create_file "Mobile-client-configs/Shared/Feature-flags.json" "{
  \"newBookingFlow\": false,
  \"socialLogin\": true,
  \"advancedReports\": false
}
"

create_file "Mobile-client-configs/Scripts/Build-app.js" "#!/usr/bin/env node
// Build specific brand app
console.log('Building brand-specific app...');
"

create_file "Mobile-client-configs/Scripts/Deploy-app.js" "#!/usr/bin/env node
// Deploy specific brand app
console.log('Deploying brand app...');
"

create_file "Mobile-client-configs/Scripts/Build-all-apps.js" "#!/usr/bin/env node
// Build all brand apps
console.log('Building all brand apps...');
"

# Mobile Admin
print_status "Creating Mobile-admin structure..."
create_dir "Mobile-admin"

# Shared
print_status "Creating Shared structure..."
create_file "Shared/Types/User.types.js" "export const UserTypes = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  CLIENT: 'client'
};
"

create_file "Shared/Types/Appointment.types.js" "export const AppointmentStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};
"

create_file "Shared/Types/service.types.js" "export const ServiceCategory = {
  HAIRCUT: 'haircut',
  COLORING: 'coloring',
  STYLING: 'styling',
  TREATMENT: 'treatment',
  MANICURE: 'manicure',
  PEDICURE: 'pedicure'
};
"

create_file "Shared/Constans/Api.js" "export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh'
  },
  USERS: '/users',
  APPOINTMENTS: '/appointments',
  SERVICES: '/services',
  CLIENTS: '/clients'
};
"

create_file "Shared/Constans/common.js" "export const COMMON_CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  },
  DATE_FORMATS: {
    DISPLAY: 'MM/DD/YYYY',
    API: 'YYYY-MM-DD'
  },
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 50
  }
};
"

create_file "Shared/Utils/Validation.js" "export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone);
};

export const validatePassword = (password) => {
  return password.length >= 8;
};
"

create_file "Shared/Utils/Formaters.js" "export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const formatDate = (date, format = 'MM/DD/YYYY') => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  switch(format) {
    case 'MM/DD/YYYY':
      return \`\${month}/\${day}/\${year}\`;
    case 'YYYY-MM-DD':
      return \`\${year}-\${month}-\${day}\`;
    default:
      return d.toLocaleDateString();
  }
};

export const formatTime = (time) => {
  return new Date(\`2000-01-01T\${time}\`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
"

# Infrastructure
print_status "Creating Infrastructure structure..."

create_dir "Infrastructure/Docker"
create_dir "Infrastructure/Kubernetes"
create_dir "Infrastructure/Terraform"

# Mobile deployment
create_file "Infrastructure/Mobile-deployment/Fastlane/Fastfile" "default_platform(:ios)

platform :ios do
  desc \"Deploy to App Store\"
  lane :deploy do
    build_app(scheme: \"{{SCHEME_NAME}}\")
    upload_to_app_store
  end
end

platform :android do
  desc \"Deploy to Google Play\"
  lane :deploy do
    gradle(task: \"assembleRelease\")
    upload_to_play_store
  end
end
"

create_file "Infrastructure/Mobile-deployment/Fastlane/Apple.template" "app_identifier(\"{{BUNDLE_ID}}\")
apple_id(\"{{APPLE_ID}}\")
team_id(\"{{TEAM_ID}}\")

for_platform :ios do
  for_lane :deploy do
    app_store_connect_api_key(
      key_id: \"{{KEY_ID}}\",
      issuer_id: \"{{ISSUER_ID}}\",
      key_filepath: \"{{KEY_FILEPATH}}\"
    )
  end
end
"

create_file "Infrastructure/Mobile-deployment/Fastlane/Deliverfile.template" "app_identifier(\"{{BUNDLE_ID}}\")
username(\"{{APPLE_ID}}\")

price_tier(0)
app_review_information(
  first_name: \"{{FIRST_NAME}}\",
  last_name: \"{{LAST_NAME}}\",
  phone_number: \"{{PHONE_NUMBER}}\",
  email_address: \"{{EMAIL}}\"
)
"

create_file "Infrastructure/Mobile-deployment/Scripts/Build-all-brands.sh" "#!/bin/bash

# Build all brand applications
BRANDS=(\"luxe-salon\" \"beauty-hub\" \"glamour-studio\" \"urban-salon\")

for brand in \"\${BRANDS[@]}\"; do
  echo \"Building \$brand...\"
  cd \"Mobile-client-configs/Brands/\$brand\"
  
  # iOS Build
  echo \"Building iOS app for \$brand\"
  fastlane ios build
  
  # Android Build  
  echo \"Building Android app for \$brand\"
  fastlane android build
  
  cd ../../..
done

echo \"All brands built successfully!\"
"

create_file "Infrastructure/Mobile-deployment/Scripts/Deploy-ios.sh" "#!/bin/bash

BRAND=\$1

if [ -z \"\$BRAND\" ]; then
  echo \"Usage: ./deploy-ios.sh <brand-name>\"
  exit 1
fi

echo \"Deploying iOS app for \$BRAND...\"
cd \"Mobile-client-configs/Brands/\$BRAND\"
fastlane ios deploy
"

create_file "Infrastructure/Mobile-deployment/Scripts/Deploy-android-sh" "#!/bin/bash

BRAND=\$1

if [ -z \"\$BRAND\" ]; then
  echo \"Usage: ./deploy-android.sh <brand-name>\"
  exit 1
fi

echo \"Deploying Android app for \$BRAND...\"
cd \"Mobile-client-configs/Brands/\$BRAND\"
fastlane android deploy
"

create_file "Infrastructure/Mobile-deployment/Scripts/Batch-deploy.sh" "#!/bin/bash

# Deploy all brands to stores
BRANDS=(\"luxe-salon\" \"beauty-hub\" \"glamour-studio\" \"urban-salon\")
PLATFORM=\$1

if [ -z \"\$PLATFORM\" ]; then
  echo \"Usage: ./batch-deploy.sh <ios|android|both>\"
  exit 1
fi

for brand in \"\${BRANDS[@]}\"; do
  echo \"Deploying \$brand for \$PLATFORM...\"
  
  if [ \"\$PLATFORM\" = \"ios\" ] || [ \"\$PLATFORM\" = \"both\" ]; then
    ./Deploy-ios.sh \$brand
  fi
  
  if [ \"\$PLATFORM\" = \"android\" ] || [ \"\$PLATFORM\" = \"both\" ]; then
    ./Deploy-android.sh \$brand
  fi
done

echo \"Batch deployment completed!\"
"

create_dir "Infrastructure/Mobile-deployment/Config/App-store-connect"
create_dir "Infrastructure/Mobile-deployment/Config/Google-play-console"

create_file "Infrastructure/Scripts/Deploy.sh" "#!/bin/bash

# Main deployment script
echo \"Starting deployment...\"

# Build backend
echo \"Building backend...\"
cd Backend
pip install -r Requirements.txt
python -m pytest Tests/

# Build web admin
echo \"Building web admin...\"
cd ../Web-admin
npm install
npm run build

# Deploy to production
echo \"Deploying to production...\"
# Add your deployment commands here

echo \"Deployment completed successfully!\"
"

create_file "Infrastructure/Scripts/Backup.sh" "#!/bin/bash

# Database backup script
TIMESTAMP=\$(date +\"%Y%m%d_%H%M%S\")
BACKUP_DIR=\"/backups\"

echo \"Starting backup at \$TIMESTAMP...\"

# Backup database
pg_dump \$DATABASE_URL > \"\$BACKUP_DIR/db_backup_\$TIMESTAMP.sql\"

# Remove old backups (keep last 7 days)
find \$BACKUP_DIR -name \"db_backup_*.sql\" -mtime +7 -delete

echo \"Backup completed: db_backup_\$TIMESTAMP.sql\"
"

create_file "Infrastructure/Scripts/Migrate.sh" "#!/bin/bash

# Database migration script
echo \"Running database migrations...\"

cd Backend
python -m alembic upgrade head

echo \"Migrations completed successfully!\"
"

create_file "Infrastructure/Scripts/White-label-deploy.sh" "#!/bin/bash

# White-label deployment script
BRAND=\$1
PLATFORM=\$2

if [ -z \"\$BRAND\" ] || [ -z \"\$PLATFORM\" ]; then
  echo \"Usage: ./white-label-deploy.sh <brand-name> <ios|android|both>\"
  exit 1
fi

echo \"Deploying white-label app for \$BRAND on \$PLATFORM...\"

cd \"Mobile-client-configs/Brands/\$BRAND\"

if [ \"\$PLATFORM\" = \"ios\" ] || [ \"\$PLATFORM\" = \"both\" ]; then
  echo \"Building and deploying iOS app...\"
  fastlane ios deploy
fi

if [ \"\$PLATFORM\" = \"android\" ] || [ \"\$PLATFORM\" = \"both\" ]; then
  echo \"Building and deploying Android app...\"
  fastlane android deploy
fi

echo \"White-label deployment completed for \$BRAND!\"
"

# GitHub Workflows
print_status "Creating GitHub workflows..."

create_file ".github/Workflows/Backend-ci.yml" "name: Backend CI

on:
  push:
    branches: [ main, develop ]
    paths: [ 'Backend/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'Backend/**' ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        cd Backend
        pip install -r Requirements.txt
        pip install -r Requirements-dev.txt
    
    - name: Run tests
      run: |
        cd Backend
        python -m pytest Tests/
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run linting
      run: |
        cd Backend
        flake8 .
        black --check .
"

create_file ".github/Workflows/Frontend-ci.yml" "name: Frontend CI

on:
  push:
    branches: [ main, develop ]
    paths: [ 'Web-admin/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'Web-admin/**' ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: Web-admin/package-lock.json
    
    - name: Install dependencies
      run: |
        cd Web-admin
        npm ci
    
    - name: Run tests
      run: |
        cd Web-admin
        npm test -- --coverage --watchAll=false
    
    - name: Build application
      run: |
        cd Web-admin
        npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: Web-admin/build/
"

create_file ".github/Workflows/Mobile-ci.yml" "name: Mobile CI

on:
  push:
    branches: [ main, develop ]
    paths: [ 'Mobile-client-core/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'Mobile-client-core/**' ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: Mobile-client-core/package-lock.json
    
    - name: Install dependencies
      run: |
        cd Mobile-client-core
        npm ci
    
    - name: Run tests
      run: |
        cd Mobile-client-core
        npm test -- --coverage --watchAll=false
    
    - name: Run linting
      run: |
        cd Mobile-client-core
        npm run lint
"

create_file ".github/Workflows/White-label-deploy.yml" "name: White-label Deploy

on:
  workflow_dispatch:
    inputs:
      brand:
        description: 'Brand to deploy'
        required: true
        type: choice
        options:
        - luxe-salon
        - beauty-hub
        - glamour-studio
        - urban-salon
      platform:
        description: 'Platform to deploy'
        required: true
        type: choice
        options:
        - ios
        - android
        - both

jobs:
  deploy:
    runs-on: macos-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Setup Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: '3.0'
        bundler-cache: true
    
    - name: Install Fastlane
      run: gem install fastlane
    
    - name: Deploy white-label app
      run: |
        chmod +x Infrastructure/Scripts/White-label-deploy.sh
        ./Infrastructure/Scripts/White-label-deploy.sh \${{ github.event.inputs.brand }} \${{ github.event.inputs.platform }}
      env:
        FASTLANE_USER: \${{ secrets.FASTLANE_USER }}
        FASTLANE_PASSWORD: \${{ secrets.FASTLANE_PASSWORD }}
        MATCH_PASSWORD: \${{ secrets.MATCH_PASSWORD }}
"

# Make scripts executable
print_status "Making scripts executable..."
chmod +x Backend/Scripts/seed_data.py
chmod +x Mobile-client-core/Scripts/*.js
chmod +x Mobile-client-configs/Scripts/*.js
chmod +x Infrastructure/Scripts/*.sh
chmod +x Infrastructure/Mobile-deployment/Scripts/*.sh

print_success "Project structure created successfully!"
print_status "Project: $PROJECT_NAME"
print_status "Total directories and files created."

echo ""
print_success "🎉 Your salon management system structure is ready!"
echo ""
print_status "Next steps:"
echo "1. Navigate to your project: cd $PROJECT_NAME"
echo "2. Initialize git repository: git init"
echo "3. Set up your backend environment"
echo "4. Install dependencies for each component"
echo "5. Configure your database and API endpoints"
echo ""
print_status "Structure includes:"
echo "• Backend (Python FastAPI)"
echo "• Web Admin Panel (React.js)"
echo "• Mobile Client Core (React Native)"
echo "• White-label Configuration System"
echo "• Infrastructure & Deployment Scripts"
echo "• CI/CD GitHub Workflows"
echo ""
print_status "Happy coding! 🚀"