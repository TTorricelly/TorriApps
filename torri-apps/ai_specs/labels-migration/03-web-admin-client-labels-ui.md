# Task 3: Web-admin Client Labels UI Implementation

## Context
The Web-admin already has a complete Labels CRUD interface. Now we need to integrate label management into the Client management interface, allowing administrators to assign/remove labels from clients and view client labels.

**Existing Implementation:**
- **Labels Page**: `/Web-admin/Src/Pages/Labels/LabelsPage.jsx` - Full CRUD
- **Clients Page**: `/Web-admin/Src/Pages/Clients/` - Client management
- **Labels API Service**: `/Web-admin/Src/Services/labels.js`
- **Users API Service**: `/Web-admin/Src/Services/users.js`

## Goal
Add label management capabilities to the client interface in Web-admin, including viewing, assigning, and removing labels with an intuitive UX.

## What Needs to Be Done

### 1. Update User API Service

```javascript
// Web-admin/Src/Services/users.js
// Add label-related endpoints

// Get user labels
export const getUserLabels = async (userId) => {
  const response = await api.get(`/users/${userId}/labels`);
  return response.data;
};

// Add label to user
export const addLabelToUser = async (userId, labelId) => {
  const response = await api.post(`/users/${userId}/labels/${labelId}`);
  return response.data;
};

// Remove label from user
export const removeLabelFromUser = async (userId, labelId) => {
  const response = await api.delete(`/users/${userId}/labels/${labelId}`);
  return response.data;
};

// Bulk update user labels
export const updateUserLabels = async (userId, labelIds) => {
  const response = await api.post(`/users/${userId}/labels/bulk`, labelIds);
  return response.data;
};

// Get users by label
export const getUsersByLabel = async (labelId, params = {}) => {
  const response = await api.get(`/users/by-label/${labelId}`, { params });
  return response.data;
};
```

### 2. Create Label Management Component

```jsx
// Web-admin/Src/Components/Clients/ClientLabels.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { getAllLabels } from '../../Services/labels';
import { updateUserLabels } from '../../Services/users';
import { useTheme } from '@mui/material/styles';

const ClientLabels = ({ client, onUpdate, editable = true }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allLabels, setAllLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);

  useEffect(() => {
    if (open) {
      loadLabels();
    }
  }, [open]);

  useEffect(() => {
    if (client?.labels) {
      setSelectedLabels(client.labels);
    }
  }, [client]);

  const loadLabels = async () => {
    try {
      setLoading(true);
      const response = await getAllLabels({ limit: 100, isActive: true });
      setAllLabels(response.data || []);
    } catch (err) {
      setError('Erro ao carregar labels');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      const labelIds = selectedLabels.map(label => label.id);
      const updatedUser = await updateUserLabels(client.id, labelIds);
      onUpdate(updatedUser);
      setOpen(false);
    } catch (err) {
      setError('Erro ao atualizar labels');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLabel = (labelToRemove) => {
    setSelectedLabels(prev => prev.filter(label => label.id !== labelToRemove.id));
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ mr: 1 }}>
          Preferências:
        </Typography>
        
        {client?.labels?.map((label) => (
          <Chip
            key={label.id}
            label={label.name}
            size="small"
            sx={{
              backgroundColor: label.color,
              color: theme.palette.getContrastText(label.color),
              '& .MuiChip-deleteIcon': {
                color: 'inherit',
                opacity: 0.7,
                '&:hover': {
                  opacity: 1
                }
              }
            }}
            onDelete={editable ? () => handleRemoveLabel(label) : undefined}
          />
        ))}
        
        {editable && (
          <IconButton 
            size="small" 
            onClick={() => setOpen(true)}
            sx={{ 
              border: `1px dashed ${theme.palette.divider}`,
              width: 32,
              height: 32
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        )}
        
        {(!client?.labels || client.labels.length === 0) && !editable && (
          <Typography variant="body2" color="text.secondary">
            Nenhuma preferência cadastrada
          </Typography>
        )}
      </Box>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Gerenciar Preferências do Cliente
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Autocomplete
            multiple
            options={allLabels}
            value={selectedLabels}
            onChange={(event, newValue) => setSelectedLabels(newValue)}
            getOptionLabel={(option) => option.name}
            loading={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Selecione as preferências"
                placeholder="Digite para buscar..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  {...getTagProps({ index })}
                  sx={{
                    backgroundColor: option.color,
                    color: theme.palette.getContrastText(option.color),
                    '& .MuiChip-deleteIcon': {
                      color: 'inherit'
                    }
                  }}
                />
              ))
            }
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Chip
                  label={option.name}
                  size="small"
                  sx={{
                    backgroundColor: option.color,
                    color: theme.palette.getContrastText(option.color),
                    mr: 1
                  }}
                />
                {option.description && (
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                )}
              </Box>
            )}
          />
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {selectedLabels.length} preferência(s) selecionada(s)
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClientLabels;
```

### 3. Update Client List Table

```jsx
// Web-admin/Src/Pages/Clients/ClientsPage.jsx
// Add labels column to the table

import ClientLabels from '../../Components/Clients/ClientLabels';

// In the columns definition, add:
{
  field: 'labels',
  headerName: 'Preferências',
  flex: 1,
  renderCell: (params) => (
    <ClientLabels 
      client={params.row} 
      editable={false}
      onUpdate={(updated) => {
        // Update the row in the table
        updateClientInList(updated);
      }}
    />
  ),
},

// Add label filter to the filters
<Autocomplete
  multiple
  options={availableLabels}
  value={selectedLabelFilters}
  onChange={(e, value) => setSelectedLabelFilters(value)}
  getOptionLabel={(option) => option.name}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Filtrar por preferências"
      size="small"
    />
  )}
  sx={{ minWidth: 200 }}
/>
```

### 4. Update Client Detail/Edit Form

```jsx
// Web-admin/Src/Pages/Clients/ClientForm.jsx
// Replace hair type field with labels

import ClientLabels from '../../Components/Clients/ClientLabels';

// Remove hair type field and add:
<Grid item xs={12}>
  <Box sx={{ mt: 2, mb: 2 }}>
    <Typography variant="h6" gutterBottom>
      Preferências do Cliente
    </Typography>
    <ClientLabels
      client={formData}
      editable={true}
      onUpdate={(updatedClient) => {
        setFormData(prev => ({
          ...prev,
          labels: updatedClient.labels
        }));
      }}
    />
  </Box>
</Grid>
```

### 5. Add Label Statistics to Dashboard

```jsx
// Web-admin/Src/Pages/Dashboard/ClientsStats.jsx
// Add label distribution chart

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getAllLabels } from '../../Services/labels';

const LabelDistribution = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLabelStats();
  }, []);

  const loadLabelStats = async () => {
    try {
      const response = await getAllLabels({ 
        limit: 10, 
        orderBy: 'usage_count',
        order: 'desc' 
      });
      
      const chartData = response.data.map(label => ({
        name: label.name,
        value: label.usage_count || 0,
        color: label.color
      }));
      
      setData(chartData);
    } catch (error) {
      console.error('Error loading label stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Preferências Mais Comuns
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

### 6. Quick Actions for Bulk Label Assignment

```jsx
// Web-admin/Src/Components/Clients/BulkLabelAssignment.jsx

const BulkLabelAssignment = ({ selectedClients, onComplete }) => {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState([]);
  const [action, setAction] = useState('add'); // add, remove, replace
  
  const handleBulkUpdate = async () => {
    try {
      // Call bulk API endpoint
      const promises = selectedClients.map(clientId => 
        updateUserLabels(clientId, labels.map(l => l.id))
      );
      
      await Promise.all(promises);
      onComplete();
      setOpen(false);
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<LabelIcon />}
        onClick={() => setOpen(true)}
        disabled={selectedClients.length === 0}
      >
        Gerenciar Labels ({selectedClients.length})
      </Button>
      
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        {/* Dialog content for bulk assignment */}
      </Dialog>
    </>
  );
};
```

### 7. Update Types and Constants

```javascript
// Web-admin/Src/Utils/types.js
// Update User type to include labels

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  // hair_type?: string; // REMOVE
  labels?: Label[]; // ADD
  // ... other fields
}
```

## Output
1. Updated API service with label endpoints
2. ClientLabels component for managing labels
3. Updated client list with label display
4. Updated client form with label management
5. Label statistics for dashboard
6. Bulk label assignment functionality
7. Updated types and interfaces

## Technical Details
- **Framework**: React with Material-UI
- **State Management**: Component state with hooks
- **API Integration**: Axios-based service layer
- **UI Components**: Material-UI with custom styling
- **Performance**: Lazy loading for label lists

## Validation Steps
1. Test label display in client list
2. Test adding labels to a client
3. Test removing labels from a client
4. Test bulk label operations
5. Verify label filtering works
6. Test autocomplete performance with many labels
7. Verify color contrast for all label colors
8. Test responsive design on different screens
9. Verify proper error handling
10. Test concurrent updates handling