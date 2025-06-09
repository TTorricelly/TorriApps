
## Mobile White-Label System

### Brand Configuration
- **Shared core**: Common React Native codebase in `Mobile-client-core/`
- **Brand configs**: Individual brand settings in `Mobile-client-configs/Brands/`
- **Build automation**: Scripts generate brand-specific apps with custom themes, assets, and store configurations

### Build Process
```bash
# Build all brand apps
cd Mobile-client-configs/Scripts
node Build-all-apps.js

# Build specific brand
node Build-app.js --brand=beauty-hub
```
