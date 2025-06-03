# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TorriApps is a multi-tenant salon/barbershop management SaaS platform with white-label mobile client applications. The system serves multiple beauty businesses through schema-based database multi-tenancy and provides branded mobile apps for their customers.

## Architecture

### Multi-Tenant Database Strategy
- **Schema-based multi-tenancy**: Each tenant gets its own MySQL schema
- **Public schema**: Stores tenant metadata and admin users in `public.tenants` and `public.admin_master_users` tables
- **Tenant schemas**: Store business-specific data (users, appointments, services, etc.)
- **TenantMiddleware**: Handles schema switching automatically using JWT token payload (no headers needed)

### Component Structure
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL with multi-tenant architecture
- **Web-admin**: React.js administrative interface for salon owners
- **Mobile-client-core**: React Native base application with white-label capabilities
- **Mobile-client-configs**: Brand-specific configurations and assets for white-label apps
- **Infrastructure**: Docker, Kubernetes, Terraform deployment automation

## Development Commands

### Backend Development
```bash
# Navigate to backend directory
cd torri-apps/Backend

# Install dependencies
pip install -r Requirements.txt

# Run development server
PYTHONPATH=. uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests
python3 -m pytest Tests/

# Database migrations
alembic revision --autogenerate -m "Migration message"
alembic upgrade head
```

### Testing
- **Framework**: pytest with SQLAlchemy fixtures
- **Test Database**: SQLite in-memory for speed
- **Multi-tenant Testing**: Uses `conftest.py` with tenant and user fixtures
- **Test Structure**: Separate test modules per feature in `Tests/` directory

### Environment Configuration
Required `.env` file in Backend directory:
```
DATABASE_URL=mysql+mysqlconnector://root:@localhost:3306/torri_app_public
SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
DEBUG=true
```

## Key Design Patterns

### Multi-Tenant Request Flow (Session-Based)
1. **TenantMiddleware** intercepts requests and extracts tenant info from JWT token payload
2. **Public routes** (auth, docs, health) bypass tenant validation
3. **Tenant routes** require valid JWT token containing `tenant_id` and `tenant_schema`
4. **Middleware extracts tenant info** from JWT and sets `request.state.tenant_schema_name`
5. **Database dependencies** use request state to switch MySQL schemas automatically
6. **No X-Tenant-ID header needed** - all tenant context comes from the cryptographically signed JWT token

### Module Structure
Each business module follows this pattern:
```
Modules/FeatureName/
├── __init__.py
├── models.py      # SQLAlchemy models
├── schemas.py     # Pydantic models for API
├── routes.py      # FastAPI route handlers
├── services.py    # Business logic layer
└── constants.py   # Module-specific constants
```

### Authentication & Authorization
- **JWT tokens** with tenant-specific user roles (GESTOR, PROFESSIONAL, CLIENT)
- **JWT payload contains**: `tenant_id`, `tenant_schema`, `role`, `sub` (user email), `exp` (expiration)
- **Multi-tenant users**: Users belong to specific tenants via `tenant_id` foreign key
- **Role-based access**: Different API permissions based on user roles
- **Tenant isolation**: Automatic tenant context from JWT token eliminates need for separate headers

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

## Database Schema Management

### Alembic Multi-Tenant Setup
- **Base metadata**: `Base` for tenant schemas, `BasePublic` for public schema
- **Schema detection**: Models automatically detect target schema via `__table_args__`
- **Migration strategy**: Separate migrations for public vs tenant schemas

### Key Models
- **Public Schema**: `Tenant`, `AdminMasterUser` 
- **Tenant Schema**: `UserTenant`, `Service`, `Appointment`, `Availability`

## API Structure

### Route Organization
- **Global prefix**: `/api/v1` for all API endpoints
- **Module routing**: Each module registers its own router with appropriate tags
- **Public routes**: Authentication and health checks (bypass tenant middleware)
- **Tenant routes**: Require valid JWT token with tenant context

### Request Headers (Current Implementation)
- **Authorization**: Bearer JWT token for authenticated endpoints (contains all tenant context)
- **X-Tenant-ID**: ⚠️ **DEPRECATED** - No longer used. Tenant info comes from JWT token payload.

### Frontend API Usage
```javascript
// ✅ CORRECT: Only Authorization header needed
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// ❌ DEPRECATED: Don't use X-Tenant-ID header
// api.defaults.headers.common['X-Tenant-ID'] = tenantId;
```

## JWT-Based Tenant System

### Token Payload Structure
The JWT token contains all necessary tenant context:
```json
{
  "sub": "user@example.com",
  "tenant_id": "uuid-string",
  "tenant_schema": "tenant_beauty_hub", 
  "role": "GESTOR",
  "exp": 1234567890
}
```

### Backend Flow
1. **Login**: User authenticates → Backend creates JWT with tenant info from user's tenant_id
2. **Request**: Frontend sends request with `Authorization: Bearer <token>`
3. **TenantMiddleware**: Extracts tenant info from JWT payload automatically
4. **Database**: Uses `request.state.tenant_schema_name` for schema switching
5. **Response**: Returns tenant-specific data

### Key Files
- **JWT Logic**: `Backend/Core/Security/jwt.py` - Token creation/validation with `TokenPayload` model
- **Middleware**: `Backend/Core/Middleware/TenantMiddleware.py` - Automatic tenant extraction
- **Frontend API**: `Web-admin/Src/api/client.js` - Simple Bearer token authentication

### Important Authentication Rules

#### **Cross-Schema Foreign Key Constraints**
⚠️ **CRITICAL**: In multi-tenant architectures, avoid cross-schema foreign key constraints:

- **Problem**: Foreign keys referencing `public.tenants` from tenant schemas cause SQLAlchemy initialization errors
- **Solution**: Use application-level validation instead of database-level foreign keys
- **Pattern**: Remove `ForeignKey(f"{settings.default_schema_name}.tenants.id")` from tenant schema models

**✅ CORRECT Pattern:**
```python
# In tenant schema models (Categories, Services, etc.)
tenant_id = Column(CHAR(36), nullable=False, index=True)  # No FK constraint
```

**❌ WRONG Pattern:**
```python
# This causes "NoReferencedTableError" in multi-tenant setups
tenant_id = Column(CHAR(36), ForeignKey("torri_app_public.tenants.id"), nullable=False)
```

#### **UUID vs String Type Handling**
⚠️ **CRITICAL**: When working with user authentication and database lookups:

- **JWT tokens contain UUID strings**: `payload.tenant_id` is a string representation
- **Database stores UUIDs as CHAR(36)**: MySQL columns are string type, not UUID type
- **SQLAlchemy comparisons require type matching**: UUID objects ≠ string values in queries
- **ALL service layer functions must convert UUID parameters to strings**

**✅ CORRECT Pattern:**
```python
# Convert UUID to string for database comparison (Authentication)
user = db.query(UserTenant).filter(
    UserTenant.email == email,
    UserTenant.tenant_id == str(token_tenant_id)  # Convert UUID to string
).first()

# Convert UUID to string for database comparison (Service Layer)
def get_categories_by_tenant(db: Session, tenant_id: UUID) -> List[CategorySchema]:
    stmt = select(Category).where(Category.tenant_id == str(tenant_id))  # Convert UUID to string
    return db.execute(stmt).scalars().all()

# Convert UUIDs to strings for complex queries
def get_service_by_id(db: Session, service_id: UUID, tenant_id: UUID) -> Service:
    stmt = select(Service).where(
        Service.id == str(service_id),      # Convert UUID to string
        Service.tenant_id == str(tenant_id) # Convert UUID to string
    )
    return db.execute(stmt).scalars().first()
```

**❌ WRONG Pattern:**
```python
# This will fail - UUID object vs string comparison
user = db.query(UserTenant).filter(
    UserTenant.email == email,
    UserTenant.tenant_id == token_tenant_id  # UUID object won't match string
).first()

# This will return 0 results - UUID object vs string comparison
stmt = select(Category).where(Category.tenant_id == tenant_id)  # UUID won't match CHAR(36)
```

**⚠️ COMMON MISTAKE**: Service layer functions receiving UUID parameters from FastAPI routes must convert them to strings before database operations. This affects ALL CRUD operations including create, read, update, and delete functions.

#### **Database Connection Pool Corruption Prevention**
⚠️ **CRITICAL**: Multi-tenant schema switching can corrupt the database connection pool if not handled properly:

**The Problem:**
- MySQL connections use `USE schema_name` to switch contexts
- When exceptions occur during database operations, connections can get "stuck" in wrong schemas
- Connection pool reuses these corrupted connections, causing data leakage between tenants
- Symptoms: Categories/data loading from wrong tenant schemas, requiring server restart

**✅ CORRECT Pattern - Always Rollback Before HTTPException:**
```python
def create_category(db: Session, category_data: CategoryCreate, tenant_id: UUID) -> CategorySchema:
    # Check for conflicts
    existing = db.execute(select(Category).where(Category.name == category_data.name)).first()
    if existing:
        db.rollback()  # ✅ CRITICAL: Clean up before exception
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists"
        )
    
    # Continue with creation...
    db.add(new_category)
    db.commit()
    return new_category
```

**❌ WRONG Pattern - No Rollback Before Exception:**
```python
def create_category(db: Session, category_data: CategoryCreate, tenant_id: UUID) -> CategorySchema:
    # Check for conflicts
    existing = db.execute(select(Category).where(Category.name == category_data.name)).first()
    if existing:
        # ❌ WRONG: No rollback - leaves session in inconsistent state
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists"
        )
    
    # Database operations...
```

**✅ Database Connection Pool Configuration:**
```python
# In Config/Database.py
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,                    # Validate connections before use
    pool_recycle=1800,                     # Recycle connections every 30 minutes
    pool_size=5,                           # Smaller pool to reduce corruption surface
    max_overflow=10,                       # Limited overflow connections
    pool_reset_on_return='commit',         # Force reset connection state on return
    echo=False
)
```

**✅ Enhanced Database Dependency with Schema Verification:**
```python
def get_db(request: Request):
    db = SessionLocal()
    
    if tenant_schema_name:
        try:
            # Force schema switch with verification
            db.execute(text(f"USE `{tenant_schema_name}`;"))
            db.commit()
            
            # Verify schema switch worked
            result = db.execute(text("SELECT DATABASE();")).scalar()
            if result != tenant_schema_name:
                raise Exception(f"Schema switch failed")
        except Exception as e:
            db.close()
            raise HTTPException(status_code=500, detail="Schema access error")
    
    try:
        yield db
    except Exception:
        db.rollback()  # Clean up on any exception
        raise
    finally:
        # Always reset to public schema
        if tenant_schema_name:
            try:
                db.execute(text(f"USE `{settings.default_schema_name}`;"))
                db.commit()
            except:
                db.connection().invalidate()  # Force remove corrupted connection
        db.close()
```

**⚠️ ALL HTTPException Must Include db.rollback():**
Every service function that can raise HTTPException during database operations must call `db.rollback()` first. This includes:
- Validation errors (409 Conflict, 400 Bad Request)
- Not found errors (404 Not Found) 
- Business logic violations
- Any exception that interrupts normal transaction flow

**⚠️ Avoid db.refresh() After Exceptions:**
Remove `db.refresh()` calls as they can cause session disconnection issues. Objects are automatically updated after `db.commit()`.

#### **Avoid Mixed Schema Access - Single-Schema Per Request Pattern**
⚠️ **ARCHITECTURE**: The most effective way to prevent pool corruption is to eliminate mixed schema access within the same request lifecycle:

**✅ CORRECT Architecture - Public Data at Login Only:**
```javascript
// 1. Login once → Get ALL public schema data
POST /api/v1/auth/enhanced-login
{
  "access_token": "jwt...",
  "tenant": { "id": "uuid", "name": "Beauty Hub", "logo_url": "..." },
  "user": { "id": "uuid", "email": "user@domain.com", "full_name": "..." }
}

// 2. Store in frontend session storage
localStorage.setItem('tenantInfo', JSON.stringify(response.tenant));

// 3. All subsequent requests = TENANT SCHEMA ONLY
GET /api/v1/categories     // Only tenant schema
GET /api/v1/services       // Only tenant schema  
GET /api/v1/users          // Only tenant schema
```

**❌ WRONG Architecture - Mixed Schema Access:**
```javascript
// Every page load = Schema switching risk
GET /api/v1/tenants/me     // PUBLIC schema
GET /api/v1/categories     // TENANT schema  
// Connection pool corruption risk!
```

**Implementation Pattern:**
```python
# Enhanced login returns complete public data
@router.post("/enhanced-login", response_model=EnhancedToken)
async def enhanced_login(login_request: EnhancedLoginRequest, db: Session = Depends(get_public_db)):
    user, tenant_schema = authenticate_user(db, ...)
    tenant_data = TenantService.get_tenant_by_id(db, user.tenant_id)
    
    return {
        "access_token": access_token,
        "tenant": { "id": tenant_data.id, "name": tenant_data.name, ... },
        "user": { "id": user.id, "email": user.email, ... }
    }

# Remove /tenants/me endpoint - no longer needed
# All other endpoints use get_db() (tenant schema only)
```

**Benefits:**
- ✅ **Zero pool corruption** - no schema mixing after login
- ✅ **Better performance** - fewer API calls, cached tenant data
- ✅ **Cleaner architecture** - clear separation of public vs tenant operations
- ✅ **Enhanced security** - reduced public schema access surface

#### **Database Enum Values**
- **Database enums must match Python enum values exactly**: Case-sensitive
- **UserRole enum**: Use uppercase values (`'GESTOR'`, `'PROFISSIONAL'`, etc.)
- **Update database**: `ALTER TABLE users_tenant MODIFY COLUMN role ENUM('GESTOR','ATENDENTE','PROFISSIONAL','CLIENTE')`

## API Patterns by Data Location

### **Tenant Schema APIs** (Users, Services, Appointments, Availability)
**Data Location**: Tenant-specific schemas (`tenant_xyz`)
**Pattern**: Session-based with automatic schema switching
```python
# ✅ Correct pattern for tenant data
@router.post("/categories")
async def create_category(
    current_user: UserTenant = Depends(get_current_user_tenant),
    db: Session = Depends(get_db)  # Auto-switches to tenant schema
):
    return service_logic.create_category(
        db=db, 
        tenant_id=current_user.tenant_id  # From session
    )
```

### **Public Schema APIs** (Tenants, Admin)
**Data Location**: Public schema (`torri_app_public`)
**Pattern**: Direct JWT token access
```python
# ✅ Correct pattern for public data
@router.get("/tenants/me")
async def get_current_tenant(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_public_db)  # Stays on public schema
):
    payload = decode_access_token(token)
    return TenantService.get_tenant_by_id(db, UUID(payload.tenant_id))
```

### **Why Two Patterns?**
- **Tenant data**: Lives in isolated schemas, requires schema switching via middleware
- **Public data**: Lives in shared public schema, accessed directly without switching

## Deployment

### Infrastructure
- **Docker**: Containerized applications with multi-stage builds
- **Kubernetes**: Production orchestration with tenant isolation
- **Terraform**: Infrastructure as code for cloud resources

### Mobile Deployment
- **Fastlane**: Automated iOS and Android app store deployments
- **Multi-brand**: Batch deployment system for all white-label apps
- **Store management**: Separate App Store Connect and Google Play Console configurations per brand

## Design System & Style Guide

### Modern Dark Theme Specification

TorriApps uses a comprehensive modern dark theme design system for consistent visual identity across all admin interfaces.

#### **Color Palette**

**Primary Backgrounds:**
- `bg-bg-primary`: `#1A1A2E` - Main application background (dark blue-purple base)
- `bg-bg-secondary`: `#1F1F3A` - Cards, modals, and content containers  
- `bg-bg-tertiary`: `#2A2A4A` - Subtle elements, borders, highlights

**Text Colors:**
- `text-text-primary`: `#E0E0E0` - Main headings and important content
- `text-text-secondary`: `#A0A0A0` - Supporting text, descriptions, metadata
- `text-text-tertiary`: `#606060` - Disabled states, less relevant information

**Accent & Interactive Colors:**
- `text-accent-primary`: `#00BFFF` - Primary actions, links, active elements
- `text-accent-secondary`: `#8A2BE2` - Secondary actions, alternate highlights

**Status Colors:**
- `text-status-success` / `bg-status-success`: `#28A745` - Success states, confirmations
- `text-status-warning` / `bg-status-warning`: `#FFC107` - Warnings, alerts  
- `text-status-error` / `bg-status-error`: `#DC3545` - Errors, destructive actions
- `text-status-info`: `#17A2B8` - Informational content

**Data Visualization Palette:**
- Chart colors: `#FF6384`, `#36A2EB`, `#FFCE56`, `#4BC0C0`, `#9966FF`, `#FF9F40`

#### **Typography System**

**Font Family:** Inter, Montserrat, Roboto, or similar modern sans-serif

**Text Scales:**
- `text-h1`: 28-32px, Bold (700) - Main page titles
- `text-h2`: 22-26px, SemiBold (600) - Section headers  
- `text-h3`: 18-20px, SemiBold (600) - Card titles, subsections
- `text-body`: 14-16px, Regular (400) - Main content text
- `text-small`: 12-14px, Regular (400) - Labels, metadata
- `text-large`: 36-48px+, Bold (700) - KPIs, important metrics

**Text Styles:**
- Line height: 1.5-1.7 for optimal readability
- Letter spacing: Slight negative (-0.01em to -0.02em) for large titles

#### **Spacing System (8px Base)**

**Spacing Scale:**
- `xs`: 4px - Minimal spacing
- `s`: 8px - Small gaps  
- `m`: 16px - Standard component padding
- `l`: 24px - Card margins, section spacing
- `xl`: 32px - Large separations
- `xxl`: 48px+ - Major layout blocks

#### **Component Specifications**

**Cards & Containers:**
- Background: `bg-bg-secondary`
- Border radius: `rounded-card` (8-12px)
- Shadow: `shadow-card` / `shadow-card-hover`
- Borders: `border-bg-tertiary`
- Internal padding: `p-m` or `p-l`

**Buttons:**
- Primary: `bg-accent-primary hover:bg-accent-primary/90`
- Secondary: `border-accent-primary text-accent-primary hover:bg-accent-primary/10`
- Success: `bg-status-success hover:bg-status-success/90`
- Danger: `bg-status-error hover:bg-status-error/90`
- Border radius: `rounded-button` (6-8px)
- Padding: `px-m py-s`

**Form Inputs:**
- Background: `bg-bg-primary`
- Border: `border-bg-tertiary focus:border-accent-primary`
- Text: `text-text-primary placeholder-text-tertiary`
- Focus ring: `focus:ring-accent-primary`
- Border radius: `rounded-input` (6-8px)

**Tables:**
- Header: `bg-bg-secondary text-text-primary font-semibold`
- Rows: Alternating `bg-bg-primary` and `bg-bg-secondary` (zebra stripes)
- Borders: `border-bg-tertiary`
- Hover: Subtle background change

**Modals:**
- Backdrop: `bg-black/50`
- Container: `bg-bg-secondary rounded-card shadow-card border-bg-tertiary`
- Responsive: `max-w-md mx-m max-h-[90vh] overflow-y-auto`

#### **Animation & Transitions**

**Standard Transitions:**
- Duration: `duration-fast` (200-300ms)
- Easing: `ease-out`
- Properties: `transition-colors`, `transition-shadow`, `transition-opacity`

**Interactive States:**
- Hover: Opacity changes (90% opacity) or subtle background shifts
- Focus: Ring indicators with `focus:ring-accent-primary`
- Active: Slightly darker/lighter color variants

#### **Implementation Classes**

The design system uses semantic CSS classes that map to the color palette:

```css
/* Example semantic class mapping */
.bg-bg-primary { background-color: #1A1A2E; }
.bg-bg-secondary { background-color: #1F1F3A; }
.text-text-primary { color: #E0E0E0; }
.text-accent-primary { color: #00BFFF; }
.rounded-card { border-radius: 8px; }
.shadow-card { box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.2); }
```

#### **Accessibility Standards**

- **Contrast Ratio**: Minimum WCAG AA compliance (4.5:1 for normal text)
- **Focus Indicators**: Visible focus rings for keyboard navigation
- **Color Independence**: Information not conveyed by color alone
- **Text Scaling**: Support for 200% zoom without horizontal scrolling

#### **Usage Guidelines**

1. **Consistency**: Always use semantic classes rather than hardcoded colors
2. **Hierarchy**: Maintain proper text and visual hierarchy throughout interfaces  
3. **Spacing**: Use the defined spacing scale for all layouts
4. **Components**: Follow component specifications for buttons, forms, cards
5. **Responsiveness**: Ensure layouts work across all device sizes

This design system ensures consistent, accessible, and modern interfaces across the entire TorriApps platform.

## Localization & Language Standards

### Portuguese Language Requirement

**All user-facing text must be in Portuguese (Brazilian Portuguese).**

#### **Interface Text Guidelines**

**✅ Required Portuguese Elements:**
- Page titles and headers (`Categorias de Serviços`, `Gerenciar Usuários`)
- Form labels (`Nome da Categoria *`, `Ordem de Exibição`)
- Button text (`Criar Categoria`, `Salvar`, `Cancelar`, `Excluir`)
- Status messages (`Categoria criada com sucesso!`, `Erro ao carregar dados`)
- Placeholder text (`Digite o nome da categoria`)
- Validation messages (`Nome é obrigatório`, `A ordem deve ser 0 ou maior`)
- Modal titles (`Confirmar Exclusão`, `Editar Categoria`)
- Loading states (`Carregando categorias...`, `Criando...`, `Atualizando...`)
- Empty states (`Nenhuma categoria ainda`, `Crie sua primeira categoria`)
- Error messages (`Falha ao criar categoria`, `Erro ao carregar categorias`)

**❌ English Text Not Allowed in UI:**
- Any text visible to end users
- Form labels, buttons, or status messages
- Navigation items or page titles
- Tooltips or help text

#### **Code Implementation Standards**

**✅ Acceptable English Usage:**
- Variable names, function names, class names
- Code comments and documentation
- Console.log messages for debugging
- API endpoint paths and technical identifiers
- File names and directory structures

**Example Implementation:**
```jsx
// ✅ CORRECT: Portuguese UI with English code
const createCategory = () => {
  const [loading, setLoading] = useState(false); // English variable names OK
  
  return (
    <button onClick={handleCreate}>
      {loading ? 'Criando...' : 'Criar Categoria'} {/* Portuguese UI text */}
    </button>
  );
};

// ❌ WRONG: English UI text
const createCategory = () => {
  return (
    <button>
      Create Category {/* English not allowed in UI */}
    </button>
  );
};
```

#### **Common Portuguese Translations**

**Interface Actions:**
- Create → Criar
- Edit → Editar  
- Delete → Excluir
- Save → Salvar
- Cancel → Cancelar
- Update → Atualizar
- View → Visualizar
- Search → Pesquisar

**Form Elements:**
- Name → Nome
- Description → Descrição
- Category → Categoria
- Order → Ordem
- Icon → Ícone
- Image → Imagem
- Required → Obrigatório
- Optional → Opcional

**Status Messages:**
- Success → Sucesso
- Error → Erro
- Warning → Aviso
- Loading → Carregando
- Created successfully → Criado com sucesso
- Updated successfully → Atualizado com sucesso
- Deleted successfully → Excluído com sucesso
- Failed to create → Falha ao criar
- Failed to update → Falha ao atualizar
- Failed to delete → Falha ao excluir

**States & Conditions:**
- No items yet → Nenhum item ainda
- Empty → Vazio
- Current → Atual
- New → Novo/Nova
- Confirm → Confirmar
- Are you sure? → Tem certeza?
- This action cannot be undone → Esta ação não pode ser desfeita

#### **Implementation Rule**

When developing any user-facing feature:

1. **Start with Portuguese text** from the beginning
2. **Use Portuguese in all mockups** and prototypes  
3. **Validate with Brazilian Portuguese speakers** if unsure about translations
4. **Maintain consistency** across similar features
5. **Update existing English text** to Portuguese when encountered

This ensures TorriApps provides a native Portuguese experience for all Brazilian users and maintains professional localization standards throughout the platform.