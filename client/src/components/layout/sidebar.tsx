import { Link, useLocation, useRoute } from "wouter";
import { Eye, Search, DollarSign, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import NetworkSwitcher from "./network-switcher";
import { useNetwork } from "@/lib/web3/NetworkContext";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const [isRoot] = useRoute("/");

  const navItems = [
    {
      label: "PYView",
      href: "/pyview",
      icon: <LayoutDashboard className="h-5 w-5 mr-3" />,
    },
    {
      label: "TracePay",
      href: "/tracepay",
      icon: <Search className="h-5 w-5 mr-3" />,
    },
  ];

  // Redirect from root to pyview
  useEffect(() => {
    if (isRoot) {
      setLocation("/pyview");
    }
  }, [isRoot, setLocation]);

  return (
    <aside className="bg-white w-64 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-primary to-secondary w-8 h-8 rounded-md flex items-center justify-center">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl">PYUSD xRay</h1>
            <p className="text-xs text-gray-500">Transaction Forensics</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                location === item.href 
                  ? "bg-primary text-white" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <NetworkSwitcher />
        <div className="mt-2 text-xs text-gray-500">
          <span>Powered by GCP Blockchain</span>
        </div>
      </div>
    </aside>
  );
}
