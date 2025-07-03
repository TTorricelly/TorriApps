import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardBody, Typography, Spinner } from '@material-tailwind/react';
import { labelsApi } from '../../Services/labels';

const LabelDistribution = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLabelStats();
  }, []);

  const loadLabelStats = async () => {
    try {
      const response = await labelsApi.getAll({ 
        limit: 10, 
        is_active: true 
      });
      
      // Mock usage count for demonstration - in real app this would come from API
      const chartData = (response.items || []).map((label, index) => ({
        name: label.name,
        value: Math.floor(Math.random() * 50) + 5, // Mock data
        color: label.color || '#00BFFF'
      })).filter(item => item.value > 0);
      
      setData(chartData);
    } catch (error) {
      console.error('Error loading label stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-bg-secondary border-bg-tertiary">
        <CardBody className="flex justify-center items-center h-80">
          <Spinner className="h-8 w-8" />
        </CardBody>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-bg-secondary border-bg-tertiary">
        <CardBody>
          <Typography variant="h6" className="text-text-primary mb-4">
            Preferências Mais Comuns
          </Typography>
          <div className="flex justify-center items-center h-60">
            <Typography variant="small" className="text-text-secondary">
              Nenhuma preferência encontrada
            </Typography>
          </div>
        </CardBody>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-3 shadow-lg">
          <Typography variant="small" className="text-text-primary font-medium">
            {data.name}
          </Typography>
          <Typography variant="small" className="text-text-secondary">
            {data.value} clientes ({((data.value / data.payload.total) * 100).toFixed(1)}%)
          </Typography>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show label if slice is too small
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#fff" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Calculate total for percentage calculations
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <Card className="bg-bg-secondary border-bg-tertiary">
      <CardBody>
        <Typography variant="h6" className="text-text-primary mb-4">
          Preferências Mais Comuns
        </Typography>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithTotal}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dataWithTotal.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <Typography variant="small" className="text-text-secondary truncate">
                {entry.name} ({entry.value})
              </Typography>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default LabelDistribution;