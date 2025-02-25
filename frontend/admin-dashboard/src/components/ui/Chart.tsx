import React from 'react';
import { Box, useTheme, Typography, CircularProgress } from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { useThemeContext } from '../../contexts/ThemeContext';
import Card from './Card';

// Chart types supported by the component
export type ChartType = 'bar' | 'line' | 'area' | 'pie';

// Data point interface for chart data
export interface DataPoint {
  [key: string]: string | number;
}

// Props for the Chart component
interface ChartProps {
  /**
   * Type of chart to render
   */
  type: ChartType;
  
  /**
   * Chart data as an array of data points
   */
  data: DataPoint[];
  
  /**
   * Keys to use for the x-axis (category axis)
   */
  xAxisKey?: string;
  
  /**
   * Array of data keys to display in the chart
   */
  dataKeys: string[];
  
  /**
   * Array of colors for the data series
   * If not provided, default colors will be used
   */
  colors?: string[];
  
  /**
   * Chart title
   */
  title?: string;
  
  /**
   * Chart subtitle or description
   */
  subtitle?: string;
  
  /**
   * Height of the chart in pixels
   */
  height?: number;
  
  /**
   * Whether the chart is in a loading state
   */
  loading?: boolean;
  
  /**
   * Whether to show the chart legend
   */
  showLegend?: boolean;
  
  /**
   * Whether to show the grid lines
   */
  showGrid?: boolean;
  
  /**
   * Whether to stack the data (for bar and area charts)
   */
  stacked?: boolean;
  
  /**
   * Custom tooltip component
   */
  customTooltip?: React.FC<TooltipProps<any, any>>;
}

/**
 * Reusable Chart component that supports different chart types
 * Uses recharts library for rendering charts
 */
const Chart: React.FC<ChartProps> = ({
  type,
  data,
  xAxisKey = 'name',
  dataKeys,
  colors,
  title,
  subtitle,
  height = 300,
  loading = false,
  showLegend = true,
  showGrid = true,
  stacked = false,
  customTooltip
}) => {
  const theme = useTheme();
  const { isDarkMode } = useThemeContext();
  
  // Default colors based on the theme
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff8042'
  ];
  
  // Use provided colors or default colors
  const chartColors = colors || defaultColors;
  
  // Text color based on theme mode
  const textColor = isDarkMode ? theme.palette.text.primary : theme.palette.text.primary;
  
  // Grid color based on theme mode
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  // Render the appropriate chart based on the type
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: textColor }}
                stroke={textColor}
              />
              <YAxis 
                tick={{ fill: textColor }}
                stroke={textColor}
              />
              <Tooltip content={customTooltip} />
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Bar 
                  key={key}
                  dataKey={key}
                  fill={chartColors[index % chartColors.length]}
                  stackId={stacked ? 'stack' : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: textColor }}
                stroke={textColor}
              />
              <YAxis 
                tick={{ fill: textColor }}
                stroke={textColor}
              />
              <Tooltip content={customTooltip} />
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={chartColors[index % chartColors.length]}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: textColor }}
                stroke={textColor}
              />
              <YAxis 
                tick={{ fill: textColor }}
                stroke={textColor}
              />
              <Tooltip content={customTooltip} />
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId={stacked ? 'stack' : undefined}
                  fill={chartColors[index % chartColors.length]}
                  stroke={chartColors[index % chartColors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKeys[0]}
                nameKey={xAxisKey}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartColors[index % chartColors.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return <Typography color="error">Unsupported chart type: {type}</Typography>;
    }
  };
  
  return (
    <Card
      title={title}
      subtitle={subtitle}
      sx={{ height: '100%' }}
    >
      {loading ? (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: height 
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        renderChart()
      )}
    </Card>
  );
};

export default Chart; 