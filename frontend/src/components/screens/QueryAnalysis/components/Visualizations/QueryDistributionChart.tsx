import { memo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { TableDistribution, OperationDistribution } from '@/types/query';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface QueryDistributionChartProps {
  type: 'table' | 'operation';
  data: TableDistribution[] | OperationDistribution[];
  onSelect?: (item: string) => void;
  className?: string;
}

const COLORS = [
  '#06b6d4', // cyan
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#10b981', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ef4444', // red
  '#6366f1', // indigo
];

const OPERATION_COLORS: Record<string, string> = {
  SELECT: '#06b6d4',
  INSERT: '#10b981',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
};

export const QueryDistributionChart = memo<QueryDistributionChartProps>(
  ({ type, data, onSelect, className }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (!data || data.length === 0) {
      return (
        <Card className={cn('bg-gray-900 border-gray-800 p-6', className)}>
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
            No data available
          </div>
        </Card>
      );
    }

    const handleClick = (entry: TableDistribution | OperationDistribution, index: number) => {
      setActiveIndex(index);
      if (onSelect) {
        if (type === 'table') {
          onSelect((entry as TableDistribution).table);
        } else {
          onSelect((entry as OperationDistribution).operation);
        }
      }
    };

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
            <p className="text-white font-medium mb-1">
              {type === 'table' ? data.table : data.operation}
            </p>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Count: {data.queryCount || data.count}</p>
              <p>Avg Time: {data.avgTime.toFixed(1)}ms</p>
              {type === 'table' && (
                <>
                  <p>Total Time: {data.totalTime.toFixed(1)}ms</p>
                  {data.issueCount > 0 && (
                    <p className="text-red-400">Issues: {data.issueCount}</p>
                  )}
                </>
              )}
              {type === 'operation' && (
                <p>Percentage: {data.percentage.toFixed(1)}%</p>
              )}
            </div>
          </div>
        );
      }
      return null;
    };

    if (type === 'table') {
      const tableData = data as TableDistribution[];
      const chartData = tableData.slice(0, 8).map((item) => ({
        name: item.table,
        value: item.queryCount,
        ...item,
      }));

      return (
        <Card className={cn('bg-gray-900 border-gray-800 p-6', className)}>
          <h3 className="text-white font-medium mb-4">Queries by Table</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                onClick={(entry, index) => handleClick(entry, index)}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke={activeIndex === index ? '#fff' : 'transparent'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {chartData.map((item, index) => (
              <button
                key={item.table}
                onClick={() => handleClick(item, index)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded text-left text-xs transition-colors',
                  activeIndex === index
                    ? 'bg-gray-800'
                    : 'hover:bg-gray-800/50'
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-300 truncate">{item.table}</span>
                <span className="text-gray-500 ml-auto">{item.queryCount}</span>
              </button>
            ))}
          </div>
        </Card>
      );
    }

    // Operation type - Bar chart
    const operationData = data as OperationDistribution[];
    const chartData = operationData.map((item) => ({
      name: item.operation,
      count: item.count,
      ...item,
    }));

    return (
      <Card className={cn('bg-gray-900 border-gray-800 p-6', className)}>
        <h3 className="text-white font-medium mb-4">Queries by Operation</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              type="number"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              onClick={(entry, index) => handleClick(entry, index)}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={OPERATION_COLORS[entry.name] || COLORS[0]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {chartData.map((item, index) => (
            <div
              key={item.operation}
              className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: OPERATION_COLORS[item.operation] || COLORS[0] }}
                />
                <span className="text-xs text-gray-400">{item.operation}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{item.count}</div>
                <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
);

QueryDistributionChart.displayName = 'QueryDistributionChart';
