/**
 * Example: How to refactor components to use the new navigation architecture
 */

// ❌ OLD WAY - Hardcoded navigation with tenant slug
import { useNavigate, useParams } from 'react-router-dom';

const OldComponent = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  
  const handleNavigation = () => {
    navigate(`/${tenantSlug}/dashboard`);
  };
  
  const handleEdit = (id) => {
    navigate(`/${tenantSlug}/clients/edit/${id}`);
  };
  
  return (
    <div>
      <button onClick={handleNavigation}>Go to Dashboard</button>
      <button onClick={() => handleEdit(123)}>Edit Client</button>
    </div>
  );
};

// ✅ NEW WAY 1 - Using navigation hook directly
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';

const NewComponent1 = () => {
  const { navigate } = useNavigation();
  
  const handleNavigation = () => {
    navigate(ROUTES.DASHBOARD);
  };
  
  const handleEdit = (id) => {
    navigate(ROUTES.ADMIN.CLIENTS.EDIT(id));
  };
  
  return (
    <div>
      <button onClick={handleNavigation}>Go to Dashboard</button>
      <button onClick={() => handleEdit(123)}>Edit Client</button>
    </div>
  );
};

// ✅ NEW WAY 2 - Using navigation context (best for complex components)
import { useNavigationContext } from '../shared/providers/NavigationProvider';

const NewComponent2 = () => {
  const { navigate, routes, isActive } = useNavigationContext();
  
  return (
    <nav>
      <a 
        onClick={() => navigate(routes.DASHBOARD)}
        className={isActive(routes.DASHBOARD) ? 'active' : ''}
      >
        Dashboard
      </a>
      <a 
        onClick={() => navigate(routes.SERVICES)}
        className={isActive(routes.SERVICES) ? 'active' : ''}
      >
        Services
      </a>
    </nav>
  );
};

// ✅ NAVIGATION COMPONENT EXAMPLE - Using config
import { useNavigationContext } from '../shared/providers/NavigationProvider';

const NavigationMenu = ({ mode = 'CLIENT' }) => {
  const { navigate, config, isActive } = useNavigationContext();
  const menuItems = config[mode];
  
  return (
    <nav>
      {menuItems.map(item => (
        <button
          key={item.key}
          onClick={() => navigate(item.route)}
          className={isActive(item.route) ? 'active' : ''}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
};

// ✅ SIDEBAR EXAMPLE - Using nested config
import { useNavigationContext } from '../shared/providers/NavigationProvider';

const AdminSidebar = () => {
  const { navigate, config, isActiveSection } = useNavigationContext();
  const sidebarConfig = config.ADMIN_SIDEBAR;
  
  return (
    <aside>
      {Object.entries(sidebarConfig).map(([key, group]) => (
        <div key={key}>
          <h3>{group.title}</h3>
          <ul>
            {group.items.map(item => (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={isActiveSection(item.path) ? 'active' : ''}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
};

// ✅ FORM EXAMPLE - Navigation after action
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';

const ClientForm = ({ clientId }) => {
  const { navigate, navigateBack } = useNavigation();
  
  const handleSubmit = async (data) => {
    try {
      await saveClient(data);
      // Navigate to client detail page after save
      navigate(ROUTES.ADMIN.CLIENTS.EDIT(clientId));
    } catch (error) {
      console.error(error);
    }
  };
  
  const handleCancel = () => {
    // Use navigateBack with fallback
    navigateBack(ROUTES.ADMIN.CLIENTS.LIST);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="button" onClick={handleCancel}>Cancel</button>
      <button type="submit">Save</button>
    </form>
  );
};