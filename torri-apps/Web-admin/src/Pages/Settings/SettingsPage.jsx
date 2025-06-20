import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Textarea,
  Select,
  Option,
  Badge,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Switch,
} from '@material-tailwind/react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

import { settingsApi } from '../../Services/settings';

export default function SettingsPage() {
  // State management
  const [settings, setSettings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, setting: null });
  const [editDialog, setEditDialog] = useState({ open: false, setting: null, isCreate: false });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Form state
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    data_type: 'string'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsApi.getAll();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      showAlert('Error loading settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter settings based on search query
  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return settings;
    
    const query = searchQuery.toLowerCase();
    return settings.filter(setting => 
      setting.key.toLowerCase().includes(query) ||
      (setting.description && setting.description.toLowerCase().includes(query))
    );
  }, [settings, searchQuery]);

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.key.trim()) {
      errors.key = 'Key is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.key)) {
      errors.key = 'Key must start with letter/underscore and contain only letters, numbers, and underscores';
    }
    
    if (!formData.value.trim()) {
      errors.value = 'Value is required';
    } else {
      // Validate value based on data type
      try {
        if (formData.data_type === 'integer') {
          const num = parseInt(formData.value);
          if (isNaN(num)) {
            errors.value = 'Value must be a valid integer';
          }
        } else if (formData.data_type === 'decimal') {
          const num = parseFloat(formData.value);
          if (isNaN(num)) {
            errors.value = 'Value must be a valid decimal number';
          }
        } else if (formData.data_type === 'boolean') {
          const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
          if (!validBooleans.includes(formData.value.toLowerCase())) {
            errors.value = 'Boolean value must be true/false, 1/0, yes/no, or on/off';
          }
        }
      } catch (error) {
        errors.value = `Invalid value for ${formData.data_type} type`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editDialog.isCreate) {
        await settingsApi.create(formData);
        showAlert('Setting created successfully');
      } else {
        const { key, ...updateData } = formData;
        await settingsApi.update(editDialog.setting.key, updateData);
        showAlert('Setting updated successfully');
      }
      
      await loadSettings();
      closeEditDialog();
    } catch (error) {
      console.error('Error saving setting:', error);
      showAlert(
        error.response?.data?.detail || 'Error saving setting', 
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await settingsApi.delete(deleteDialog.setting.key);
      showAlert('Setting deleted successfully');
      await loadSettings();
      setDeleteDialog({ open: false, setting: null });
    } catch (error) {
      console.error('Error deleting setting:', error);
      showAlert('Error deleting setting', 'error');
    }
  };

  const openCreateDialog = () => {
    setFormData({
      key: '',
      value: '',
      description: '',
      data_type: 'string'
    });
    setFormErrors({});
    setEditDialog({ open: true, setting: null, isCreate: true });
  };

  const openEditDialog = (setting) => {
    setFormData({
      key: setting.key,
      value: setting.value,
      description: setting.description || '',
      data_type: setting.data_type
    });
    setFormErrors({});
    setEditDialog({ open: true, setting, isCreate: false });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, setting: null, isCreate: false });
    setFormData({ key: '', value: '', description: '', data_type: 'string' });
    setFormErrors({});
  };

  const openDeleteDialog = (setting) => {
    setDeleteDialog({ open: true, setting });
  };

  const getDataTypeBadgeColor = (dataType) => {
    switch (dataType) {
      case 'string': return 'blue';
      case 'integer': return 'green';
      case 'decimal': return 'yellow';
      case 'boolean': return 'purple';
      default: return 'gray';
    }
  };

  const formatValue = (value, dataType) => {
    if (dataType === 'boolean') {
      return value === 'true' || value === '1' || value === 'yes' || value === 'on' ? '✓ True' : '✗ False';
    }
    return value;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Alert */}
      {alert.show && (
        <Alert
          color={alert.type === 'error' ? 'red' : 'green'}
          className="mb-6"
          onClose={() => setAlert({ show: false, message: '', type: 'success' })}
        >
          {alert.message}
        </Alert>
      )}

      <Card>
        <CardHeader floated={false} shadow={false} className="rounded-none">
          <div className="mb-4 flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <Cog6ToothIcon className="h-6 w-6" />
              <Typography variant="h5" color="blue-gray">
                Application Settings
              </Typography>
            </div>
            <Button
              onClick={openCreateDialog}
              className="flex items-center gap-3"
              size="sm"
            >
              <PlusIcon strokeWidth={2} className="h-4 w-4" />
              Add Setting
            </Button>
          </div>
          
          {/* Search */}
          <div className="w-full md:w-72">
            <Input
              label="Search settings..."
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardBody className="overflow-scroll px-0">
          <table className="mt-4 w-full min-w-max table-auto text-left">
            <thead>
              <tr>
                {['Key', 'Value', 'Type', 'Description', 'Actions'].map((head) => (
                  <th
                    key={head}
                    className="border-y border-blue-gray-100 bg-blue-gray-50/50 p-4"
                  >
                    <Typography
                      variant="small"
                      color="blue-gray"
                      className="font-normal leading-none opacity-70"
                    >
                      {head}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSettings.map((setting) => (
                <tr key={setting.id} className="even:bg-blue-gray-50/50">
                  <td className="p-4">
                    <Typography variant="small" color="blue-gray" className="font-mono font-semibold">
                      {setting.key}
                    </Typography>
                  </td>
                  <td className="p-4">
                    <Typography variant="small" color="blue-gray" className="font-medium">
                      {formatValue(setting.value, setting.data_type)}
                    </Typography>
                  </td>
                  <td className="p-4">
                    <Badge color={getDataTypeBadgeColor(setting.data_type)} variant="ghost">
                      {setting.data_type}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Typography variant="small" color="blue-gray" className="max-w-xs truncate">
                      {setting.description || '-'}
                    </Typography>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="text"
                        size="sm"
                        onClick={() => openEditDialog(setting)}
                        className="flex items-center gap-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="text"
                        size="sm"
                        color="red"
                        onClick={() => openDeleteDialog(setting)}
                        className="flex items-center gap-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSettings.length === 0 && (
            <div className="text-center py-8">
              <Typography color="blue-gray" className="text-lg font-normal">
                {searchQuery ? 'No settings found matching your search.' : 'No settings available.'}
              </Typography>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.open} handler={closeEditDialog} size="md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            {editDialog.isCreate ? 'Create New Setting' : 'Edit Setting'}
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <Input
                label="Setting Key"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                error={!!formErrors.key}
                disabled={!editDialog.isCreate}
                placeholder="e.g., max_upload_size"
              />
              {formErrors.key && (
                <Typography variant="small" color="red" className="mt-1">
                  {formErrors.key}
                </Typography>
              )}
              {editDialog.isCreate && (
                <Typography variant="small" color="gray" className="mt-1">
                  Use lowercase letters, numbers, and underscores only
                </Typography>
              )}
            </div>

            <div>
              <Select
                label="Data Type"
                value={formData.data_type}
                onChange={(value) => setFormData(prev => ({ ...prev, data_type: value }))}
              >
                <Option value="string">String</Option>
                <Option value="integer">Integer</Option>
                <Option value="decimal">Decimal</Option>
                <Option value="boolean">Boolean</Option>
              </Select>
            </div>

            <div>
              {formData.data_type === 'boolean' ? (
                <div>
                  <Typography variant="small" color="blue-gray" className="mb-2">
                    Value
                  </Typography>
                  <div className="flex gap-4">
                    <Button
                      variant={formData.value === 'true' ? 'filled' : 'outlined'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, value: 'true' }))}
                      color="green"
                    >
                      True
                    </Button>
                    <Button
                      variant={formData.value === 'false' ? 'filled' : 'outlined'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, value: 'false' }))}
                      color="red"
                    >
                      False
                    </Button>
                  </div>
                </div>
              ) : (
                <Input
                  label="Value"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  error={!!formErrors.value}
                  type={formData.data_type === 'integer' || formData.data_type === 'decimal' ? 'number' : 'text'}
                  step={formData.data_type === 'decimal' ? 'any' : undefined}
                />
              )}
              {formErrors.value && (
                <Typography variant="small" color="red" className="mt-1">
                  {formErrors.value}
                </Typography>
              )}
            </div>

            <div>
              <Textarea
                label="Description (Optional)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this setting controls"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="text"
              color="red"
              onClick={closeEditDialog}
              className="mr-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Spinner className="h-4 w-4" />}
              {editDialog.isCreate ? 'Create' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} handler={() => setDeleteDialog({ open: false, setting: null })}>
        <DialogHeader>Confirm Delete</DialogHeader>
        <DialogBody>
          Are you sure you want to delete the setting "{deleteDialog.setting?.key}"?
          This action cannot be undone.
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="blue-gray"
            onClick={() => setDeleteDialog({ open: false, setting: null })}
            className="mr-1"
          >
            Cancel
          </Button>
          <Button variant="gradient" color="red" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}