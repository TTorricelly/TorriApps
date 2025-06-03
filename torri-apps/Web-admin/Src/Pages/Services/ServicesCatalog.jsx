import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { categoriesApi } from '../../Services/categories';

const ServicesCatalog = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const queryClient = useQueryClient();

  // React Hook Form setup
  const createForm = useForm({
    defaultValues: {
      name: '',
      display_order: 0,
      icon_file: null,
    },
  });

  const editForm = useForm({
    defaultValues: {
      name: '',
      display_order: 0,
      icon_file: null,
    },
  });

  // Query to fetch categories
  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  // Mutation for creating category
  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: async (newCategory) => {
      try {
        // Simple and reliable approach: Just force immediate refetch
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
        await queryClient.refetchQueries({ queryKey: ['categories'], type: 'active' });
      } catch (error) {
        console.error('Error refreshing categories:', error);
        queryClient.invalidateQueries(['categories']);
      }
      
      setIsCreateModalOpen(false);
      createForm.reset();
      showAlert('Categoria criada com sucesso!', 'success');
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Falha ao criar categoria';
      showAlert(message, 'error');
    },
  });

  // Mutation for updating category
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: async () => {
      // Force immediate cache refresh with modern syntax
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.refetchQueries({ queryKey: ['categories'], type: 'active' });
      
      setIsEditModalOpen(false);
      editForm.reset();
      setSelectedCategory(null);
      showAlert('Categoria atualizada com sucesso!', 'success');
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Falha ao atualizar categoria';
      showAlert(message, 'error');
    },
  });

  // Mutation for deleting category
  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: async () => {
      // Force immediate cache refresh with modern syntax
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.refetchQueries({ queryKey: ['categories'], type: 'active' });
      
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      showAlert('Categoria excluída com sucesso!', 'success');
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Falha ao excluir categoria';
      showAlert(message, 'error');
      // Keep the delete modal open so user can see the error and cancel
      // The modal will only close on successful deletion or manual cancel
    },
  });

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleCreateSubmit = (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('display_order', data.display_order);
    if (data.icon_file && data.icon_file[0]) {
      formData.append('icon_file', data.icon_file[0]);
    }
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('display_order', data.display_order);
    if (data.icon_file && data.icon_file[0]) {
      formData.append('icon_file', data.icon_file[0]);
    }
    updateMutation.mutate({ id: selectedCategory.id, data: formData });
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    editForm.reset({
      name: category.name,
      display_order: category.display_order,
      icon_file: null,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <h6 className="text-h6 text-text-primary">Carregando categorias...</h6>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-status-error/10 border border-status-error text-status-error px-m py-s rounded-card mb-m">
        Erro ao carregar categorias: {error.message}
      </div>
    );
  }

  return (
    <div className="p-l bg-bg-primary min-h-screen">
      {/* Alert */}
      {alert.show && (
        <div className={`${alert.type === 'success' ? 'bg-status-success/10 border-status-success text-status-success' : 'bg-status-error/10 border-status-error text-status-error'} border px-m py-s rounded-card mb-m flex justify-between items-center`}>
          <span>{alert.message}</span>
          <button 
            onClick={() => setAlert({ show: false, message: '', type: 'success' })}
            className="ml-m text-current hover:opacity-70 transition-opacity duration-fast"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-bg-secondary rounded-card shadow-card border border-bg-tertiary">
        <div className="p-l border-b border-bg-tertiary">
          <div className="mb-l flex items-center justify-between gap-l">
            <div>
              <h1 className="text-h1 font-semibold text-text-primary mb-xs">
                Categorias de Serviços
              </h1>
              <p className="text-body text-text-secondary">
                Gerencie suas categorias de serviços com ícones personalizados e ordem de exibição
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-s sm:flex-row">
              <button
                className="bg-accent-primary hover:bg-accent-primary/90 text-white px-m py-s rounded-button font-medium transition-colors duration-fast flex items-center gap-s"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusIcon strokeWidth={2} className="h-4 w-4" />
                Nova Categoria
              </button>
            </div>
          </div>
        </div>
        <div className="p-m">
          <div className="grid grid-cols-1 gap-m sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <div key={category.id} className="bg-bg-tertiary rounded-card shadow-card border border-bg-tertiary hover:shadow-card-hover transition-shadow duration-fast">
                <div className="p-m text-center">
                  <div className="mb-m flex justify-center">
                    {category.icon_url ? (
                      <img
                        src={category.icon_url}
                        alt={category.name}
                        className="h-16 w-16 object-cover rounded-card"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-bg-secondary rounded-card flex items-center justify-center border border-bg-tertiary">
                        <PhotoIcon className="h-8 w-8 text-text-tertiary" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-h3 font-medium text-text-primary mb-s">
                    {category.name}
                  </h3>
                  <div className="inline-block bg-accent-primary/10 text-accent-primary px-s py-xs rounded-tag text-small font-medium mb-m">
                    Ordem: {category.display_order}
                  </div>
                  <div className="flex justify-center gap-s">
                    <button
                      className="p-s rounded-button text-accent-primary hover:bg-accent-primary/10 transition-colors duration-fast"
                      onClick={() => handleEdit(category)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="p-s rounded-button text-status-error hover:bg-status-error/10 transition-colors duration-fast"
                      onClick={() => handleDeleteClick(category)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-xl">
              <h3 className="text-h3 font-medium text-text-primary mb-s">
                Nenhuma categoria ainda
              </h3>
              <p className="text-body text-text-secondary mb-m">
                Crie sua primeira categoria de serviço para começar
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-accent-primary hover:bg-accent-primary/90 text-white px-m py-s rounded-button font-medium transition-colors duration-fast flex items-center gap-s mx-auto"
              >
                <PlusIcon className="h-4 w-4" />
                Criar Categoria
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="relative bg-bg-secondary rounded-card shadow-card border border-bg-tertiary w-full max-w-md mx-m max-h-[90vh] overflow-y-auto">
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
              <div className="flex items-center justify-between p-l border-b border-bg-tertiary">
                <h2 className="text-h2 font-semibold text-text-primary">Criar Nova Categoria</h2>
                <button
                  type="button"
                  className="p-s rounded-button text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors duration-fast"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="p-l space-y-m">
                <div>
                  <label className="block text-body font-medium text-text-primary mb-s">
                    Nome da Categoria *
                  </label>
                  <input
                    {...createForm.register('name', { required: 'Nome é obrigatório' })}
                    placeholder="Digite o nome da categoria"
                    className={`w-full px-m py-s rounded-input border bg-bg-primary text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors duration-fast ${createForm.formState.errors.name ? 'border-status-error' : 'border-bg-tertiary'}`}
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-small text-status-error mt-xs">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-body font-medium text-text-primary mb-s">
                    Ordem de Exibição
                  </label>
                  <input
                    {...createForm.register('display_order', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'A ordem deve ser 0 ou maior' },
                    })}
                    type="number"
                    placeholder="0"
                    className={`w-full px-m py-s rounded-input border bg-bg-primary text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors duration-fast ${createForm.formState.errors.display_order ? 'border-status-error' : 'border-bg-tertiary'}`}
                  />
                  {createForm.formState.errors.display_order && (
                    <p className="text-small text-status-error mt-xs">
                      {createForm.formState.errors.display_order.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-body font-medium text-text-primary mb-s">
                    Ícone da Categoria
                  </label>
                  <input
                    {...createForm.register('icon_file')}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="w-full px-m py-s rounded-input border border-bg-tertiary bg-bg-primary text-text-primary file:mr-s file:py-xs file:px-s file:rounded-button file:border-0 file:text-small file:font-medium file:bg-accent-primary/10 file:text-accent-primary hover:file:bg-accent-primary/20 transition-colors duration-fast"
                  />
                  <p className="text-small text-text-tertiary mt-xs">
                    Formatos suportados: PNG, JPEG, SVG (máx. 2MB)
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-s p-l border-t border-bg-tertiary">
                <button
                  type="button"
                  className="px-m py-s rounded-button text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors duration-fast"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-status-success hover:bg-status-success/90 disabled:bg-status-success/50 text-white px-m py-s rounded-button font-medium transition-colors duration-fast"
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative bg-bg-secondary rounded-card shadow-card border border-bg-tertiary w-full max-w-md mx-m max-h-[90vh] overflow-y-auto">
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)}>
              <div className="flex items-center justify-between p-l border-b border-bg-tertiary">
                <h2 className="text-h2 font-semibold text-text-primary">Editar Categoria</h2>
                <button
                  type="button"
                  className="p-s rounded-button text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors duration-fast"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="p-l space-y-m">
                <div>
                  <label className="block text-body font-medium text-text-primary mb-s">
                    Nome da Categoria *
                  </label>
                  <input
                    {...editForm.register('name', { required: 'Nome é obrigatório' })}
                    placeholder="Digite o nome da categoria"
                    className={`w-full px-m py-s rounded-input border bg-bg-primary text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors duration-fast ${editForm.formState.errors.name ? 'border-status-error' : 'border-bg-tertiary'}`}
                  />
                  {editForm.formState.errors.name && (
                    <p className="text-small text-status-error mt-xs">
                      {editForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-body font-medium text-text-primary mb-s">
                    Ordem de Exibição
                  </label>
                  <input
                    {...editForm.register('display_order', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'A ordem deve ser 0 ou maior' },
                    })}
                    type="number"
                    placeholder="0"
                    className={`w-full px-m py-s rounded-input border bg-bg-primary text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors duration-fast ${editForm.formState.errors.display_order ? 'border-status-error' : 'border-bg-tertiary'}`}
                  />
                  {editForm.formState.errors.display_order && (
                    <p className="text-small text-status-error mt-xs">
                      {editForm.formState.errors.display_order.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-body font-medium text-text-primary mb-s">
                    Ícone da Categoria
                  </label>
                  {selectedCategory?.icon_url && (
                    <div className="mb-s">
                      <p className="text-small text-text-secondary mb-s">
                        Ícone atual:
                      </p>
                      <img
                        src={selectedCategory.icon_url}
                        alt={selectedCategory.name}
                        className="h-16 w-16 object-cover rounded-card border border-bg-tertiary"
                      />
                    </div>
                  )}
                  <input
                    {...editForm.register('icon_file')}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="w-full px-m py-s rounded-input border border-bg-tertiary bg-bg-primary text-text-primary file:mr-s file:py-xs file:px-s file:rounded-button file:border-0 file:text-small file:font-medium file:bg-accent-primary/10 file:text-accent-primary hover:file:bg-accent-primary/20 transition-colors duration-fast"
                  />
                  <p className="text-small text-text-tertiary mt-xs">
                    Formatos suportados: PNG, JPEG, SVG (máx. 2MB). Deixe vazio para manter o ícone atual.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-s p-l border-t border-bg-tertiary">
                <button
                  type="button"
                  className="px-m py-s rounded-button text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors duration-fast"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-status-success hover:bg-status-success/90 disabled:bg-status-success/50 text-white px-m py-s rounded-button font-medium transition-colors duration-fast"
                >
                  {updateMutation.isPending ? 'Atualizando...' : 'Atualizar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirmOpen(false)}></div>
          <div className="relative bg-bg-secondary rounded-card shadow-card border border-bg-tertiary w-full max-w-sm mx-m">
            <div className="p-l border-b border-bg-tertiary">
              <h2 className="text-h2 font-semibold text-text-primary">Confirmar Exclusão</h2>
            </div>
            <div className="p-l">
              <p className="text-body text-text-primary">
                Tem certeza de que deseja excluir a categoria &quot;{categoryToDelete?.name}&quot;?
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-s p-l border-t border-bg-tertiary">
              <button
                type="button"
                className="px-m py-s rounded-button text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors duration-fast"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="bg-status-error hover:bg-status-error/90 disabled:bg-status-error/50 text-white px-m py-s rounded-button font-medium transition-colors duration-fast"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesCatalog;