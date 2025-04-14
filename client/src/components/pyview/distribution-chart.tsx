import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Distribution {
  holdings: {
    exchanges: number;
    daos: number;
    wallets: number;
    other: number;
  };
  issuanceBurn: {
    dates: string[];
    issuance: number[];
    burns: number[];
  };
}

interface DistributionChartProps {
  distribution?: Distribution;
}

export default function DistributionChart({ distribution }: DistributionChartProps) {
  if (!distribution) return null;
  
  const { holdings, issuanceBurn } = distribution;
  
  // Prepare data for pie chart
  const holdingData = [
    { name: 'Exchanges', value: holdings.exchanges, color: '#3B82F6' },
    { name: 'DAOs', value: holdings.daos, color: '#8B5CF6' },
    { name: 'Wallets', value: holdings.wallets, color: '#14B8A6' },
    { name: 'Other', value: holdings.other, color: '#F59E0B' },
  ];
  
  // Prepare data for line chart
  const rateData = issuanceBurn.dates.map((date, index) => ({
    date,
    issuance: issuanceBurn.issuance[index],
    burns: issuanceBurn.burns[index],
  }));
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">PYUSD Distribution & Trends</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Holding Distribution</h4>
          <div className="h-64 border border-gray-200 rounded-md">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={holdingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {holdingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Issuance vs Burn Rate</h4>
          <div className="h-64 border border-gray-200 rounded-md">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rateData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="issuance" name="Issuance" stroke="#3B82F6" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="burns" name="Burns" stroke="#EF4444" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
