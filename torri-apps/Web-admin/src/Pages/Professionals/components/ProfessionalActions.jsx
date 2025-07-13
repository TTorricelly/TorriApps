import React from 'react';
import { Button } from '@material-tailwind/react';
import { 
  PencilIcon, 
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const ProfessionalActions = ({ 
  professional,
  canMoveUp,
  canMoveDown,
  onEdit,
  onMoveUp,
  onMoveDown
}) => {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(professional.id);
  };

  const handleMoveUp = (e) => {
    e.stopPropagation();
    onMoveUp(professional.id);
  };

  const handleMoveDown = (e) => {
    e.stopPropagation();
    onMoveDown(professional.id);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-bg-tertiary bg-bg-primary/30">
      {/* Reorder Actions */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="text"
          className={`p-1 ${canMoveUp ? 'text-accent-primary hover:bg-accent-primary/10' : 'text-text-tertiary cursor-not-allowed'}`}
          onClick={handleMoveUp}
          disabled={!canMoveUp}
          title="Mover para cima"
        >
          <ArrowUpIcon className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="text"
          className={`p-1 ${canMoveDown ? 'text-accent-primary hover:bg-accent-primary/10' : 'text-text-tertiary cursor-not-allowed'}`}
          onClick={handleMoveDown}
          disabled={!canMoveDown}
          title="Mover para baixo"
        >
          <ArrowDownIcon className="h-3 w-3" />
        </Button>
      </div>

      {/* Edit Action */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outlined"
          className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-2"
          onClick={handleEdit}
          title="Editar profissional"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProfessionalActions;