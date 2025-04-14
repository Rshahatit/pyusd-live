import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChartDataPoint {
  date: string;
  volume: number;
  count: number;
}

interface ActivityChartProps {
  data?: {
    daily: ChartDataPoint[];
    weekly: ChartDataPoint[];
    monthly: ChartDataPoint[];
    all: ChartDataPoint[];
  };
}

// Format large numbers for display
const formatYAxisNumber = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

// Custom tooltip formatter
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length >= 2) {
    // Safely handle payload values
    const volumeValue = payload[0]?.value !== undefined ? payload[0].value : 0;
    const transfersValue = payload[1]?.value !== undefined ? payload[1].value : 0;
    
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-blue-600">
          Volume: {volumeValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} PYUSD
        </p>
        <p className="text-purple-600">
          Transfers: {transfersValue.toLocaleString()}
        </p>
      </div>
    );
  }

  return null;
};

export default function ActivityChart({ data }: ActivityChartProps) {
  if (!data) return null;
  
  // Use only the last 7 days data with fixed dates
  const chartData = useMemo(() => {
    // Generate fallback dates (today - 6 days to today)
    const today = new Date();
    const fallbackDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index)); // Start 6 days ago
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Map the data with fixed dates
    const fixedData = data.daily.map((item, index) => ({
      ...item,
      date: item.date === "Invalid Date" 
        ? fallbackDates[index % fallbackDates.length] 
        : item.date
    }));
    
    // Don't reverse - we want chronological order (oldest to newest)
    return fixedData;
  }, [data.daily]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">PYUSD Activity (Last 7 Days)</h3>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 15,  // Increased left margin for wider y-axis labels
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={0}
              tickMargin={10}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke="#3b82f6" 
              tickFormatter={formatYAxisNumber}
              width={50}  // Fixed width for the axis
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#8b5cf6" 
              tickFormatter={(value) => value.toString()}
              width={40}  // Fixed width for the axis
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 10 }} />
            <Bar 
              yAxisId="left" 
              dataKey="volume" 
              name="Volume (PYUSD)" 
              fill="rgba(59, 130, 246, 0.6)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="count"
              name="Transfers"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
