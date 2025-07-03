import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Typography,
  Spinner,
  Alert,
  IconButton,
  Input,
  Card,
  CardBody,
  Radio,
} from '@material-tailwind/react';
import { TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { labelsApi } from '../../Services/labels';
import { usersApi } from '../../Services/users';

const BulkLabelAssignment = ({ selectedClients, onComplete }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allLabels, setAllLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [action, setAction] = useState('add'); // add, remove, replace
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      loadLabels();
    }
  }, [open]);

  const loadLabels = async () => {
    try {
      setLoading(true);
      const response = await labelsApi.getAll({ limit: 100, is_active: true });
      setAllLabels(response.items || []);
    } catch (err) {
      setError('Erro ao carregar labels');
      console.error('Error loading labels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedLabels.length === 0) {
      setError('Selecione pelo menos uma preferência');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const labelIds = selectedLabels.map(label => label.id);
      
      // Filter out any undefined/null client IDs
      const validClientIds = selectedClients.filter(clientId => {
        return clientId && clientId !== 'undefined' && typeof clientId === 'string' && clientId.length > 0;
      });
      
      if (validClientIds.length === 0) {
        setError('Nenhum cliente válido selecionado');
        return;
      }
      
      // Process each client
      const promises = validClientIds.map(async (clientId) => {
        if (action === 'replace') {
          // For replace, just set the new labels
          return usersApi.updateUserLabels(clientId, labelIds);
        } else {
          // For add/remove, we need to get current labels first
          try {
            const currentLabels = await usersApi.getUserLabels(clientId);
            const currentLabelIds = currentLabels.map(label => label.id);
            
            let newLabelIds;
            if (action === 'add') {
              // Add new labels to existing ones (avoiding duplicates)
              newLabelIds = [...new Set([...currentLabelIds, ...labelIds])];
            } else if (action === 'remove') {
              // Remove selected labels from existing ones
              newLabelIds = currentLabelIds.filter(id => !labelIds.includes(id));
            }
            
            return usersApi.updateUserLabels(clientId, newLabelIds);
          } catch (err) {
            console.error(`Error processing client ${clientId}:`, err);
            throw err;
          }
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some updates failed:', failures);
        setError(`${failures.length} cliente(s) falharam na atualização`);
        return;
      }
      
      onComplete();
      setOpen(false);
      setSelectedLabels([]);
      setAction('add');
    } catch (error) {
      setError('Erro ao atualizar preferências em lote');
      console.error('Bulk update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelToggle = (label) => {
    const isSelected = selectedLabels.some(selected => selected.id === label.id);
    if (isSelected) {
      setSelectedLabels(prev => prev.filter(selected => selected.id !== label.id));
    } else {
      setSelectedLabels(prev => [...prev, label]);
    }
  };

  const filteredLabels = allLabels.filter(label =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (label.description && label.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getActionDescription = () => {
    switch (action) {
      case 'add':
        return 'Adicionar as preferências selecionadas aos clientes (mantendo as existentes)';
      case 'remove':
        return 'Remover as preferências selecionadas dos clientes';
      case 'replace':
        return 'Substituir todas as preferências dos clientes pelas selecionadas';
      default:
        return '';
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="sm"
        className="flex items-center gap-2 border-accent-primary text-accent-primary hover:bg-accent-primary/10"
        onClick={() => setOpen(true)}
        disabled={selectedClients.length === 0}
      >
        <TagIcon className="h-4 w-4" />
        Gerenciar Preferências ({selectedClients.length})
      </Button>

      <Dialog
        open={open}
        handler={() => setOpen(false)}
        size="lg"
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="flex items-center justify-between text-text-primary">
          <Typography variant="h5">
            Gerenciar Preferências em Lote
          </Typography>
          <IconButton
            variant="text"
            onClick={() => setOpen(false)}
            className="text-text-secondary hover:text-text-primary"
          >
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </DialogHeader>

        <DialogBody divider className="bg-bg-secondary">
          {error && (
            <Alert color="red" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="space-y-6">
            {/* Client count info */}
            <div className="bg-bg-primary p-4 rounded-lg">
              <Typography variant="small" className="text-text-primary">
                <strong>{selectedClients.filter(id => id && id !== 'undefined').length}</strong> cliente(s) válido(s) selecionado(s) para atualização
              </Typography>
              {selectedClients.some(id => !id || id === 'undefined') && (
                <Typography variant="small" className="text-red-500 mt-1">
                  Aviso: Alguns IDs de cliente são inválidos e serão ignorados
                </Typography>
              )}
            </div>

            {/* Action Selection */}
            <div>
              <Typography variant="h6" className="text-text-primary mb-3">
                Tipo de Operação
              </Typography>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Radio
                    name="action"
                    value="add"
                    checked={action === 'add'}
                    onChange={(e) => setAction(e.target.value)}
                    color="blue"
                  />
                  <Typography variant="small" className="text-text-primary">
                    Adicionar preferências
                  </Typography>
                </div>
                <div className="flex items-center gap-3">
                  <Radio
                    name="action"
                    value="remove"
                    checked={action === 'remove'}
                    onChange={(e) => setAction(e.target.value)}
                    color="blue"
                  />
                  <Typography variant="small" className="text-text-primary">
                    Remover preferências
                  </Typography>
                </div>
                <div className="flex items-center gap-3">
                  <Radio
                    name="action"
                    value="replace"
                    checked={action === 'replace'}
                    onChange={(e) => setAction(e.target.value)}
                    color="blue"
                  />
                  <Typography variant="small" className="text-text-primary">
                    Substituir todas as preferências
                  </Typography>
                </div>
              </div>
              <Typography variant="small" className="text-text-secondary mt-2">
                {getActionDescription()}
              </Typography>
            </div>

            {/* Label Search */}
            <div>
              <Input
                type="text"
                placeholder="Buscar preferências..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
              />
            </div>

            {/* Label Selection */}
            <div>
              <Typography variant="h6" className="text-text-primary mb-3">
                Selecionar Preferências
              </Typography>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {filteredLabels.map((label) => {
                      const isSelected = selectedLabels.some(selected => selected.id === label.id);
                      return (
                        <Card
                          key={label.id}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-bg-primary'
                          }`}
                          onClick={() => handleLabelToggle(label)}
                        >
                          <CardBody className="p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: label.color || '#00BFFF' }}
                              />
                              <div className="flex-1">
                                <Typography variant="small" className="text-text-primary font-medium">
                                  {label.name}
                                </Typography>
                                {label.description && (
                                  <Typography variant="small" className="text-text-secondary">
                                    {label.description}
                                  </Typography>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selected labels summary */}
            {selectedLabels.length > 0 && (
              <div className="bg-bg-primary p-4 rounded-lg">
                <Typography variant="small" className="text-text-primary mb-2">
                  <strong>{selectedLabels.length}</strong> preferência(s) selecionada(s):
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {selectedLabels.map((label) => (
                    <div
                      key={label.id}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: label.color || '#00BFFF',
                        color: '#fff'
                      }}
                    >
                      {label.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="bg-bg-secondary">
          <Button
            variant="outlined"
            onClick={() => setOpen(false)}
            className="mr-2 border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleBulkUpdate}
            disabled={loading || selectedLabels.length === 0}
            className="bg-accent-primary hover:bg-accent-primary/90"
          >
            {loading ? <Spinner className="h-4 w-4" /> : 'Aplicar Alterações'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};

export default BulkLabelAssignment;