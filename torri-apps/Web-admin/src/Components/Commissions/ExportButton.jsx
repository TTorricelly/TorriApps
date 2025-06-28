import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Typography,
} from '@material-tailwind/react';
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentIcon,
  TableCellsIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';

export default function ExportButton({ onExport }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format = 'csv') => {
    try {
      setIsExporting(true);
      await onExport(format);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Menu>
      <MenuHandler>
        <Button
          variant="outlined"
          color="blue"
          className="flex items-center gap-2"
          disabled={isExporting}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {isExporting ? 'Exportando...' : 'Exportar'}
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </MenuHandler>
      <MenuList>
        <MenuItem 
          className="flex items-center gap-3"
          onClick={() => handleExport('csv')}
        >
          <TableCellsIcon className="h-4 w-4" />
          <div>
            <Typography variant="small" className="font-medium">
              Exportar CSV
            </Typography>
            <Typography variant="tiny" className="text-blue-gray-500">
              Planilha para Excel/Google Sheets
            </Typography>
          </div>
        </MenuItem>
        
        <MenuItem 
          className="flex items-center gap-3"
          onClick={() => handleExport('pdf')}
        >
          <DocumentIcon className="h-4 w-4" />
          <div>
            <Typography variant="small" className="font-medium">
              Exportar PDF
            </Typography>
            <Typography variant="tiny" className="text-blue-gray-500">
              Relatório detalhado em PDF
            </Typography>
          </div>
        </MenuItem>

        <MenuItem 
          className="flex items-center gap-3"
          onClick={() => handleExport('receipt')}
        >
          <ReceiptRefundIcon className="h-4 w-4" />
          <div>
            <Typography variant="small" className="font-medium">
              Exportar Recibo
            </Typography>
            <Typography variant="tiny" className="text-blue-gray-500">
              Recibo de pagamento (apenas comissões pagas)
            </Typography>
          </div>
        </MenuItem>
      </MenuList>
    </Menu>
  );
}