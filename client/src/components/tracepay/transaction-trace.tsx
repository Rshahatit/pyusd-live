import { useState } from "react";
import { ChevronRight, Check, DownloadIcon, Info } from "lucide-react";
import { TransactionResult, TraceElement } from "@/lib/web3/types";

interface TransactionTraceProps {
  transaction: TransactionResult;
}

export default function TransactionTrace({ transaction }: TransactionTraceProps) {
  const [showRawTrace, setShowRawTrace] = useState(false);
  
  if (!transaction || !transaction.trace) return null;
  
  const { trace, analysis } = transaction;

  const exportTrace = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trace, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `trace-${transaction.hash}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Transaction Trace</h3>
        <div className="flex space-x-2">
          <button 
            className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
            onClick={() => setShowRawTrace(!showRawTrace)}
          >
            {showRawTrace ? "Parsed Trace" : "Raw Trace"}
          </button>
          <button 
            className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 flex items-center"
            onClick={exportTrace}
          >
            <DownloadIcon className="h-3 w-3 mr-1" /> Export
          </button>
        </div>
      </div>

      <div className="trace-scrollbar overflow-y-auto border border-gray-200 rounded-md" style={{ maxHeight: "400px" }}>
        {showRawTrace ? (
          <pre className="p-4 text-xs font-mono">
            {JSON.stringify(trace, null, 2)}
          </pre>
        ) : (
          <div className="p-4 font-mono text-sm">
            {trace.map((traceElement, index) => (
              <TraceItem key={index} item={traceElement} level={0} />
            ))}
          </div>
        )}
      </div>

      {analysis && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200 flex items-start">
          <div className="text-yellow-500 mr-3 mt-1">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-yellow-700">
              <span className="font-medium">Analysis:</span> {analysis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface TraceItemProps {
  item: TraceElement;
  level: number;
}

function TraceItem({ item, level }: TraceItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const indent = level * 16;
  
  return (
    <div className="mb-3" style={{ marginLeft: `${indent}px` }}>
      <div className="flex items-start">
        <div className="mr-2 mt-1 text-blue-500 cursor-pointer" onClick={toggleExpand}>
          {item.type === "EVENT" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <ChevronRight className={`h-4 w-4 transform ${isExpanded ? "rotate-90" : ""}`} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-medium text-gray-800">{item.type}</span>
            <span className="mx-2 text-gray-400">→</span>
            <span className={`font-medium ${getTraceTypeColor(item.type)}`}>
              {item.signature || item.name}
            </span>
          </div>
          
          {isExpanded && item.children && item.children.length > 0 && (
            <div className={`pl-4 ${item.type === "EVENT" ? "border-l-2 border-green-200" : "border-l-2 border-gray-200"}`}>
              {item.children.map((child, index) => (
                <TraceItem key={index} item={child} level={0} />
              ))}
            </div>
          )}
          
          {item.result && (
            <div className="bg-gray-50 text-gray-600 p-1 rounded text-xs mt-1">
              {Object.entries(item.result).map(([key, value]) => (
                <div className="flex justify-between" key={key}>
                  <span>{key}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
          
          {item.gasUsed && (
            <div className="bg-gray-50 text-gray-600 p-1 rounded text-xs mt-3">
              <div className="flex justify-between">
                <span>Total Gas Used:</span>
                <span>{parseInt(item.gasUsed).toLocaleString()}</span>
              </div>
              {item.returnValue && (
                <div className="flex justify-between">
                  <span>Return:</span>
                  <span className={item.error ? "text-red-600" : "text-green-600"}>
                    {item.returnValue}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTraceTypeColor(type: string): string {
  switch (type) {
    case "CALL":
      return "text-blue-600";
    case "STATICCALL":
      return "text-purple-600";
    case "EVENT":
      return "text-green-600";
    case "SLOAD":
    case "SSTORE":
      return "text-blue-600";
    case "CREATE":
    case "CREATE2":
      return "text-orange-600";
    case "DELEGATECALL":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}
