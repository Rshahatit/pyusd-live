import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  borderColor: string;
}

interface DashboardStats {
  totalSupply: {
    value: string;
    change: {
      value: string;
      direction: 'up' | 'down' | 'neutral';
    }
  };
  activeWallets: {
    value: string;
    change: {
      value: string;
      direction: 'up' | 'down' | 'neutral';
    }
  };
  transactionVolume: {
    value: string;
    change: {
      value: string;
      direction: 'up' | 'down' | 'neutral';
    }
  };
  avgTransactionValue: {
    value: string;
    change: {
      value: string;
      direction: 'up' | 'down' | 'neutral';
    }
  };
}

interface StatCardsProps {
  stats?: DashboardStats;
}

function StatCard({ title, value, change, borderColor }: StatCardProps) {
  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.direction) {
      case 'up':
        return <ArrowUp className="h-3 w-3 mr-1 text-green-600" />;
      case 'down':
        return <ArrowDown className="h-3 w-3 mr-1 text-red-600" />;
      case 'neutral':
        return <ArrowRight className="h-3 w-3 mr-1 text-gray-500" />;
    }
  };
  
  const getChangeColor = () => {
    if (!change) return "";
    
    switch (change.direction) {
      case 'up':
        return "text-green-600";
      case 'down':
        return "text-red-600";
      case 'neutral':
        return "text-gray-500";
    }
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${borderColor}`}>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {change && (
        <p className={`text-xs flex items-center mt-1 ${getChangeColor()}`}>
          {getChangeIcon()}
          <span>{change.value}</span>
        </p>
      )}
    </div>
  );
}

export default function StatCards({ stats }: StatCardsProps) {
  if (!stats) return null;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard 
        title="Total PYUSD Supply" 
        value={stats.totalSupply.value}
        change={stats.totalSupply.change}
        borderColor="border-blue-500"
      />
      <StatCard 
        title="Active Wallets" 
        value={stats.activeWallets.value}
        change={stats.activeWallets.change}
        borderColor="border-purple-500"
      />
      <StatCard 
        title="24h Transaction Volume" 
        value={stats.transactionVolume.value}
        change={stats.transactionVolume.change}
        borderColor="border-teal-500"
      />
      <StatCard 
        title="Avg. Transaction Value" 
        value={stats.avgTransactionValue.value}
        change={stats.avgTransactionValue.change}
        borderColor="border-yellow-500"
      />
    </div>
  );
}
