import React, { useState } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Typography,
  Button,
  Card,
  CardBody,
  Collapse,
  Badge,
} from '@material-tailwind/react';
import { 
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PlusIcon,
  MinusIcon,
  Bars3Icon,
  CheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const VariationGuide = ({ open, onClose }) => {
  const [expandedSections, setExpandedSections] = useState({
    basics: true,
    pricing: false,
    bulk: false,
    dragdrop: false,
    tips: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const GuideSection = ({ id, title, icon: Icon, children }) => (
    <Card className="bg-bg-primary border-bg-tertiary mb-4">
      <CardBody className="p-4">
        <Button
          variant="text"
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-0 text-text-primary hover:bg-transparent"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-accent-primary" />
            <Typography variant="h6" className="text-text-primary">
              {title}
            </Typography>
          </div>
          {expandedSections[id] ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </Button>
        
        <Collapse open={expandedSections[id]}>
          <div className="mt-4 space-y-3 text-text-secondary">
            {children}
          </div>
        </Collapse>
      </CardBody>
    </Card>
  );

  const ExampleCard = ({ title, description, example, color = "blue" }) => (
    <div className="bg-bg-secondary p-3 rounded-lg border-l-4 border-accent-primary">
      <Typography variant="small" className="text-text-primary font-medium mb-1">
        {title}
      </Typography>
      <Typography variant="small" className="text-text-secondary mb-2">
        {description}
      </Typography>
      <Badge color={color} className="text-xs">
        {example}
      </Badge>
    </div>
  );

  return (
    <Dialog 
      open={open} 
      handler={onClose}
      className="bg-bg-secondary border-bg-tertiary"
      size="xl"
    >
      <DialogHeader className="text-text-primary flex items-center gap-2">
        <QuestionMarkCircleIcon className="h-5 w-5" />
        Guia de Variações de Serviço
      </DialogHeader>
      
      <DialogBody className="max-h-[70vh] overflow-y-auto space-y-4">
        
        {/* Basics */}
        <GuideSection 
          id="basics" 
          title="Conceitos Básicos" 
          icon={InformationCircleIcon}
        >
          <Typography variant="small">
            As variações de serviço permitem criar diferentes opções para um mesmo serviço, 
            cada uma com ajustes específicos de preço e duração.
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ExampleCard
              title="Grupo de Variações"
              description="Organiza variações relacionadas"
              example="Comprimento do Cabelo"
              color="green"
            />
            <ExampleCard
              title="Variação"
              description="Opção específica dentro do grupo"
              example="Cabelo Longo (+R$ 15, +30min)"
              color="blue"
            />
          </div>
        </GuideSection>

        {/* Pricing */}
        <GuideSection 
          id="pricing" 
          title="Sistema de Preços" 
          icon={CurrencyDollarIcon}
        >
          <Typography variant="small">
            O sistema funciona com alterações (deltas) aplicadas ao preço e duração base do serviço.
          </Typography>
          
          <div className="space-y-3">
            <ExampleCard
              title="Preço Positivo"
              description="Adiciona valor ao preço base"
              example="+R$ 20,00 (mais caro)"
              color="green"
            />
            <ExampleCard
              title="Preço Negativo"
              description="Reduz o valor do preço base"
              example="-R$ 10,00 (desconto)"
              color="red"
            />
            <ExampleCard
              title="Preço Neutro"
              description="Mantém o preço base"
              example="R$ 0,00 (sem alteração)"
              color="gray"
            />
          </div>
          
          <div className="bg-bg-primary p-3 rounded-lg">
            <Typography variant="small" className="text-text-primary font-medium mb-1">
              Exemplo de Cálculo:
            </Typography>
            <Typography variant="small" className="text-text-secondary">
              • Serviço base: R$ 50,00 (60 min)<br/>
              • Variação "Cabelo Longo": +R$ 15,00 (+30 min)<br/>
              • <strong>Preço final: R$ 65,00 (90 min)</strong>
            </Typography>
          </div>
        </GuideSection>

        {/* Bulk Operations */}
        <GuideSection 
          id="bulk" 
          title="Operações em Lote" 
          icon={CheckIcon}
        >
          <Typography variant="small">
            Edite e gerencie múltiplas variações de uma vez para economizar tempo.
          </Typography>
          
          <div className="space-y-3">
            <div className="bg-bg-secondary p-3 rounded-lg">
              <Typography variant="small" className="text-text-primary font-medium mb-1">
                Como usar:
              </Typography>
              <ol className="text-text-secondary text-sm space-y-1 list-decimal list-inside">
                <li>Selecione as variações desejadas usando as checkboxes</li>
                <li>Clique em "Editar" nas ações em lote</li>
                <li>Ative os campos que deseja alterar</li>
                <li>Defina os novos valores</li>
                <li>Confirme para aplicar a todas as selecionadas</li>
              </ol>
            </div>
            
            <ExampleCard
              title="Edição em Lote"
              description="Altere o preço de 5 variações de uma vez"
              example="Todas passam a ter +R$ 10,00"
              color="blue"
            />
            
            <ExampleCard
              title="Exclusão em Lote"
              description="Remova várias variações simultaneamente"
              example="Excluir 3 variações selecionadas"
              color="red"
            />
          </div>
        </GuideSection>

        {/* Drag and Drop */}
        <GuideSection 
          id="dragdrop" 
          title="Arrastar e Soltar" 
          icon={Bars3Icon}
        >
          <Typography variant="small">
            Reorganize suas variações facilmente para melhorar a experiência do cliente.
          </Typography>
          
          <div className="bg-bg-secondary p-3 rounded-lg">
            <Typography variant="small" className="text-text-primary font-medium mb-1">
              Como reordenar:
            </Typography>
            <ol className="text-text-secondary text-sm space-y-1 list-decimal list-inside">
              <li>Localize o ícone de "barras" <Bars3Icon className="h-3 w-3 inline mx-1" /> ao lado da checkbox</li>
              <li>Clique e arraste para a posição desejada</li>
              <li>Solte para confirmar a nova posição</li>
            </ol>
          </div>
          
          <ExampleCard
            title="Ordenação Sugerida"
            description="Organize por popularidade ou preço"
            example="Mais popular → Menos popular"
            color="green"
          />
        </GuideSection>

        {/* Tips */}
        <GuideSection 
          id="tips" 
          title="Dicas e Melhores Práticas" 
          icon={QuestionMarkCircleIcon}
        >
          <div className="space-y-3">
            <ExampleCard
              title="Nomes Descritivos"
              description="Use nomes claros e específicos"
              example="Cabelo Longo, Cabelo Curto, Cabelo Médio"
              color="blue"
            />
            
            <ExampleCard
              title="Grupos Lógicos"
              description="Agrupe variações relacionadas"
              example="Comprimento, Textura, Complexidade"
              color="green"
            />
            
            <ExampleCard
              title="Preços Justos"
              description="Calcule considerando tempo e material"
              example="Mais tempo = Mais caro"
              color="amber"
            />
          </div>
          
          <div className="bg-bg-primary p-3 rounded-lg">
            <Typography variant="small" className="text-text-primary font-medium mb-1">
              ⚠️ Cuidados Importantes:
            </Typography>
            <ul className="text-text-secondary text-sm space-y-1 list-disc list-inside">
              <li>Evite preços negativos que tornem o serviço muito barato</li>
              <li>Durações negativas não devem zerar o tempo total</li>
              <li>Teste sempre o resultado final antes de ativar</li>
              <li>Mantenha consistência entre variações similares</li>
            </ul>
          </div>
        </GuideSection>

      </DialogBody>
      
      <DialogFooter>
        <Button
          onClick={onClose}
          className="bg-accent-primary hover:bg-accent-primary/90"
        >
          Entendi
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default VariationGuide;