
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

#### **UI Components Implementation Guide**

**✅ Input Fields (Material Tailwind):**
```jsx
<Input
  className="bg-bg-primary border-bg-tertiary text-text-primary"
  labelProps={{ className: "text-text-secondary" }}
  containerProps={{ className: "text-text-primary" }}
  // Other props...
/>
```
- **Text Color**: Always include `text-text-primary` in className
- **Container**: Add `containerProps={{ className: "text-text-primary" }}` for consistent text rendering
- **Background**: Use `bg-bg-primary` for input fields
- **Labels**: Use `labelProps={{ className: "text-text-secondary" }}` for proper label styling

**✅ Select Dropdowns (Material Tailwind):**
```jsx
<Select
  className="bg-bg-primary border-bg-tertiary text-text-primary"
  labelProps={{ className: "text-text-secondary" }}
  containerProps={{ className: "text-text-primary" }}
  menuProps={{ 
    className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50",
    style: { 
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: '4px',
      zIndex: 9999
    }
  }}
>
  <Option className="text-text-primary hover:bg-bg-tertiary hover:text-white focus:bg-bg-tertiary focus:text-accent-primary selected:bg-accent-primary selected:text-white data-[selected=true]:bg-accent-primary data-[selected=true]:text-white data-[selected=true]:hover:text-white">
    Option Text
  </Option>
</Select>
```
- **Dropdown Container**: Use relative positioning wrapper `<div className="relative">`
- **Menu Positioning**: Include complete `menuProps` with positioning and z-index
- **Option States**: Define hover, focus, and selected states with proper contrast
- **Scrolling**: Add `max-h-60 overflow-y-auto` for long lists
- **Z-Index**: Use `z-50` and `zIndex: 9999` to ensure dropdown appears above other content

**✅ Alert/Toast Notifications:**
```jsx
{alert.show && (
  <div className="fixed top-4 right-4 z-50 w-96">
    <Alert
      open={alert.show}
      onClose={() => setAlert({ ...alert, show: false })}
      color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'amber' : 'green'}
      className="mb-4"
    >
      {alert.message}
    </Alert>
  </div>
)}
```
- **Positioning**: Use `fixed top-4 right-4` for consistent placement
- **State Management**: Include `showAlert` helper function with auto-dismiss (5 seconds)
- **Color Mapping**: Map alert types to Material Tailwind colors (red, amber, green)

**✅ Rich Text Editor Styling:**
```jsx
<div className="border border-bg-tertiary rounded-lg bg-bg-primary">
  {/* Toolbar */}
  <div className="border-b border-bg-tertiary p-2">
    <button className="px-2 py-1 text-text-primary hover:bg-bg-tertiary rounded">
      B
    </button>
  </div>
  
  {/* Editor Content */}
  <div
    contentEditable
    className="p-4 min-h-[300px] max-h-[600px] overflow-y-auto text-text-primary focus:outline-none"
  />
</div>
```
- **Container**: Use `border-bg-tertiary` and `bg-bg-primary`
- **Toolbar**: Include hover states with `hover:bg-bg-tertiary`
- **Content**: Set `text-text-primary` for editor text
- **Height**: Use min/max height with scrolling for content overflow

**✅ Image Upload Components:**
```jsx
<div className="border border-bg-tertiary rounded-lg p-4 bg-bg-primary">
  {preview ? (
    <div className="relative">
      <img className="w-20 h-20 object-cover rounded-lg" />
      <button className="absolute -top-2 -right-2 bg-status-error text-white rounded-full p-1">
        <XMarkIcon className="h-3 w-3" />
      </button>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-4">
      <PhotoIcon className="h-8 w-8 text-text-tertiary mb-2" />
      <Button className="bg-accent-primary hover:bg-accent-primary/90">
        Selecionar Arquivo
      </Button>
    </div>
  )}
</div>
```
- **Container**: Use consistent border and background styling
- **Placeholder State**: Include icon with `text-text-tertiary`
- **Remove Button**: Use `bg-status-error` for destructive actions
- **Preview**: Maintain consistent rounded corners and sizing

**⚠️ Common Styling Mistakes to Avoid:**
- **Missing text color**: Always include `text-text-primary` in input/select className
- **Dark text on dark background**: Use `containerProps` for Material Tailwind components
- **Dropdown positioning**: Always use relative wrapper and proper z-index
- **Poor contrast in selected states**: Define all interaction states (hover, focus, selected)
- **Missing overflow handling**: Add scrolling for long dropdown lists
- **Inconsistent spacing**: Use the defined spacing scale (`p-m`, `gap-4`, etc.)

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