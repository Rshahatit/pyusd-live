import { useQuery, useQueryClient } from "@tanstack/react-query";
import StatCards from "@/components/pyview/stat-cards";
import ActivityChart from "@/components/pyview/activity-chart";
import TopHolders from "@/components/pyview/top-holders";
import RecentActivity from "@/components/pyview/recent-activity";
import DistributionChart from "@/components/pyview/distribution-chart";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function PYView() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboardStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['/api/dashboard/activity'],
  });

  const { data: topHoldersData, isLoading: isLoadingHolders } = useQuery({
    queryKey: ['/api/dashboard/holders'],
  });

  const { data: recentTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/dashboard/transactions'],
  });

  const { data: distributionData, isLoading: isLoadingDistribution } = useQuery({
    queryKey: ['/api/dashboard/distribution'],
  });
  
  const [isRefreshingHolders, setIsRefreshingHolders] = useState(false);
  const [isRefreshingTransactions, setIsRefreshingTransactions] = useState(false);
  
  const refreshTopHolders = async () => {
    try {
      setIsRefreshingHolders(true);
      
      // Call the API to clear the cache
      const response = await fetch('/api/dashboard/clear-cache');
      const data = await response.json();
      
      if (data.success) {
        // Invalidate and refetch the holders data
        await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/holders'] });
        toast({
          title: "Top holders refreshed",
          description: "Latest blockchain data is now displayed",
          variant: "default",
        });
      } else {
        throw new Error(data.error || 'Failed to refresh data');
      }
    } catch (error) {
      console.error('Error refreshing top holders:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh top holders data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingHolders(false);
    }
  };
  
  const refreshRecentTransactions = async () => {
    try {
      setIsRefreshingTransactions(true);
      
      // Call the API with refresh=true to bypass cache
      const response = await fetch('/api/dashboard/transactions?refresh=true');
      const data = await response.json();
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/transactions'] });
      
      toast({
        title: "Recent transactions refreshed",
        description: "Latest blockchain data is now displayed",
        variant: "default",
      });
    } catch (error) {
      console.error('Error refreshing recent transactions:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh recent transactions data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingTransactions(false);
    }
  };

  return (
    <section id="pyview">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">PYUSD Statistics Dashboard</h2>
        <p className="text-gray-600">Real-time and historical PYUSD usage metrics</p>
      </div>

      {isLoadingStats ? (
        <div className="py-4">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-24 bg-slate-200 rounded col-span-1"></div>
                <div className="h-24 bg-slate-200 rounded col-span-1"></div>
                <div className="h-24 bg-slate-200 rounded col-span-1"></div>
                <div className="h-24 bg-slate-200 rounded col-span-1"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <StatCards stats={dashboardStats} />
      )}

      {isLoadingActivity ? (
        <div className="py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      ) : (
        <ActivityChart data={activityData} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Top Holders</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshTopHolders}
              disabled={isRefreshingHolders || isLoadingHolders}
              className="flex items-center gap-1"
            >
              <RefreshCw size={16} className={isRefreshingHolders ? "animate-spin" : ""} />
              <span>{isRefreshingHolders ? "Refreshing..." : "Refresh"}</span>
            </Button>
          </div>
          {isLoadingHolders ? (
            <div className="py-4">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
                <div className="h-72 bg-slate-200 rounded"></div>
              </div>
            </div>
          ) : (
            <TopHolders holders={topHoldersData?.holders || []} />
          )}
        </div>

        <div>
          {isLoadingTransactions ? (
            <div className="py-4">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
                <div className="h-72 bg-slate-200 rounded"></div>
              </div>
            </div>
          ) : (
            <RecentActivity 
              transactions={recentTransactions?.transactions || []} 
              onRefresh={refreshRecentTransactions}
              isRefreshing={isRefreshingTransactions}
            />
          )}
        </div>
      </div>

      {isLoadingDistribution ? (
        <div className="py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      ) : (
        <DistributionChart distribution={distributionData} />
      )}
    </section>
  );
}
