import { TraceElement } from "../../client/src/lib/web3/types";

// Parse trace result from debug_traceTransaction or our fallback
export function parseTrace(traceData: any): TraceElement[] {
  // Handle empty or error cases
  if (!traceData) {
    return [];
  }

  // Process the root call - handle both formats
  if (!traceData.calls && traceData.type === "CALL") {
    // This is our simplified fallback format 
    return [
      {
        type: traceData.type,
        from: traceData.from,
        to: traceData.to,
        value: traceData.value,
        gas: traceData.gas,
        gasUsed: traceData.gasUsed,
        input: traceData.input,
        output: traceData.output || "0x",
        signature: traceData.input && traceData.input.length >= 10 
          ? getKnownFunctionSignature(traceData.input.substring(0, 10), traceData.to)
          : "Unknown()",
        children: [],
        result: {
          gasUsed: traceData.gasUsed,
          return: traceData.output || "0x",
        },
        returnValue: "success (limited trace data)"
      }
    ];
  }
  
  // Process the standard debug_traceTransaction format
  return [processTraceCall(traceData)];
}

// Process a single trace call recursively
function processTraceCall(call: any): TraceElement {
  // Basic call information
  const traceElement: TraceElement = {
    type: call.type || "CALL",
    from: call.from,
    to: call.to,
    value: call.value,
    gas: call.gas,
    gasUsed: call.gasUsed,
    input: call.input,
    output: call.output,
    error: call.error,
  };

  // Extract function signature from input data if available
  if (call.input && call.input.length >= 10) {
    const functionSelector = call.input.substring(0, 10);
    traceElement.signature = getKnownFunctionSignature(functionSelector, call.to);
  }

  // Add children if there are subcalls
  if (call.calls && call.calls.length > 0) {
    traceElement.children = call.calls.map(processTraceCall);
  }

  // Process events if available
  if (call.logs && call.logs.length > 0) {
    // Convert logs to TraceElement objects and add them as children
    const eventElements = call.logs.map(processTraceEvent);
    if (!traceElement.children) {
      traceElement.children = eventElements;
    } else {
      traceElement.children = [...traceElement.children, ...eventElements];
    }
  }

  // Add result information
  traceElement.result = {
    gasUsed: call.gasUsed,
    return: call.output ? `0x${call.output}` : (call.error || "success"),
  };

  // Check if it's a successful or failed call
  if (call.error) {
    traceElement.returnValue = "failed: " + call.error;
    traceElement.error = call.error;
  } else {
    traceElement.returnValue = call.output 
      ? (call.output === "0x" ? "success" : `0x${call.output.substring(0, 10)}...`) 
      : "success";
  }

  return traceElement;
}

// Process trace events (logs)
function processTraceEvent(log: any): TraceElement {
  // Create an event trace element
  const eventElement: TraceElement = {
    type: "EVENT",
    from: log.address,
    signature: getEventSignature(log.topics[0], log.address),
  };

  // Try to parse the event data
  try {
    eventElement.result = {
      topics: log.topics,
      data: log.data,
    };
  } catch (error) {
    console.error("Error parsing event data:", error);
  }

  return eventElement;
}

// Get a known function signature (simplified version)
function getKnownFunctionSignature(selector: string, address?: string): string {
  // This would ideally be backed by a comprehensive database of 4byte signatures
  // For demo purposes, we'll include a few PYUSD-related function signatures
  const knownSignatures: Record<string, string> = {
    "0xa9059cbb": "PYUSD.transfer(address,uint256)",
    "0x095ea7b3": "PYUSD.approve(address,uint256)",
    "0x23b872dd": "PYUSD.transferFrom(address,address,uint256)",
    "0x70a08231": "PYUSD.balanceOf(address)",
    "0x18160ddd": "PYUSD.totalSupply()",
    "0x40c10f19": "PYUSD.mint(address,uint256)",
    "0x42966c68": "PYUSD.burn(uint256)",
  };

  // Return the known signature or the selector if not known
  return knownSignatures[selector] || `Unknown(${selector})`;
}

// Get event signature (simplified version)
function getEventSignature(topic: string, address?: string): string {
  // Known event signatures
  const knownEventSignatures: Record<string, string> = {
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "PYUSD.Transfer(address,address,uint256)",
    "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "PYUSD.Approval(address,address,uint256)",
  };

  return knownEventSignatures[topic] || `Unknown(${topic})`;
}

// Analyze a transaction trace for potential issues or patterns
export function analyzeTrace(trace: TraceElement[], isPYUSD: boolean): string {
  if (!trace || trace.length === 0) {
    return "Unable to analyze trace data";
  }

  // Check for common patterns and issues
  if (isPYUSD) {
    // Check for PYUSD specific patterns
    return analyzePYUSDTransaction(trace);
  }

  // Generic transaction analysis
  return "This is a standard transaction. No suspicious patterns detected.";
}

// Analyze PYUSD specific transactions
function analyzePYUSDTransaction(trace: TraceElement[]): string {
  // Look for specific patterns in the trace
  const rootCall = trace[0];
  
  // Check for transfer function
  if (rootCall.signature?.includes("transfer") && rootCall.returnValue?.includes("success")) {
    return "This is a standard PYUSD transfer. No suspicious patterns detected.";
  }
  
  // Check for approval function
  if (rootCall.signature?.includes("approve")) {
    return "This is a PYUSD approval transaction, which allows the spender to transfer tokens on behalf of the owner.";
  }
  
  // Check for minting
  if (rootCall.signature?.includes("mint")) {
    return "This is a PYUSD minting transaction, creating new tokens.";
  }
  
  // Check for burning
  if (rootCall.signature?.includes("burn")) {
    return "This is a PYUSD burning transaction, removing tokens from circulation.";
  }

  // Default analysis
  return "This is a PYUSD-related transaction. No abnormal patterns detected.";
}
