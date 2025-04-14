import { 
  User, 
  InsertUser, 
  Trace, 
  InsertTrace, 
  Payment, 
  InsertPayment, 
  FaucetRequest, 
  InsertFaucetRequest 
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Transaction trace operations
  getTrace(txHash: string): Promise<Trace | undefined>;
  saveTrace(trace: InsertTrace): Promise<Trace>;
  getRecentTraces(limit: number): Promise<Trace[]>;
  getPYUSDTraces(limit: number): Promise<Trace[]>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, status: string, txHash?: string): Promise<Payment | undefined>;
  getUserPayments(userId: number): Promise<Payment[]>;
  getPaymentsByAddress(address: string): Promise<Payment[]>;
  
  // Faucet operations
  createFaucetRequest(request: InsertFaucetRequest): Promise<FaucetRequest>;
  updateFaucetRequest(id: number, status: string, txHash?: string): Promise<FaucetRequest | undefined>;
  getFaucetRequestsByAddress(address: string): Promise<FaucetRequest[]>;
  
  // Dashboard operations
  getTopHolders(limit: number): Promise<any[]>;
  getRecentTransactions(limit: number): Promise<any[]>;
  getTokenDistribution(): Promise<any>;
  getActivityData(): Promise<any>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private traces: Map<string, Trace>;
  private payments: Map<number, Payment>;
  private faucetRequests: Map<number, FaucetRequest>;
  private userIdCounter: number;
  private paymentIdCounter: number;
  private faucetRequestIdCounter: number;
  
  // Mock data for dashboard
  private mockTopHolders: any[];
  private mockRecentTransactions: any[];
  private mockTokenDistribution: any;
  private mockActivityData: any;
  
  constructor() {
    this.users = new Map();
    this.traces = new Map();
    this.payments = new Map();
    this.faucetRequests = new Map();
    this.userIdCounter = 1;
    this.paymentIdCounter = 1;
    this.faucetRequestIdCounter = 1;
    
    // Initialize with some example data for testing
    this.initializeMockData();
  }
  
  private initializeMockData() {
    // Mock trace data would be initialized here in a real implementation
    
    // Mock addresses for testing
    const testAddress = "0x3b2d1c6742F999E787fF66e445Cc2D511B3Fa7e9";
    
    // Add a demo user
    this.users.set(1, {
      id: 1,
      username: "demo",
      password: "password", // In a real app, this would be hashed
      ethAddress: testAddress,
      createdAt: new Date(),
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async getUserByAddress(address: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.ethAddress === address);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Transaction trace operations
  async getTrace(txHash: string): Promise<Trace | undefined> {
    return this.traces.get(txHash);
  }
  
  async saveTrace(trace: InsertTrace): Promise<Trace> {
    const newTrace: Trace = { 
      ...trace, 
      id: this.traces.size + 1,
      timestamp: new Date()
    };
    this.traces.set(trace.txHash, newTrace);
    return newTrace;
  }
  
  async getRecentTraces(limit: number): Promise<Trace[]> {
    return Array.from(this.traces.values())
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit);
  }
  
  async getPYUSDTraces(limit: number): Promise<Trace[]> {
    return Array.from(this.traces.values())
      .filter(trace => trace.isPYUSD)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit);
  }
  
  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const newPayment: Payment = { 
      ...payment, 
      id, 
      timestamp: new Date(),
      txHash: null,
      gasUsed: null,
      gasSaved: null
    };
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async updatePayment(id: number, status: string, txHash?: string): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { 
      ...payment, 
      status, 
      ...(txHash && { txHash }),
    };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  async getUserPayments(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
  }
  
  async getPaymentsByAddress(address: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.fromAddress === address || payment.toAddress === address)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
  }
  
  // Faucet operations
  async createFaucetRequest(request: InsertFaucetRequest): Promise<FaucetRequest> {
    const id = this.faucetRequestIdCounter++;
    const newRequest: FaucetRequest = { 
      ...request, 
      id, 
      timestamp: new Date(),
      txHash: null
    };
    this.faucetRequests.set(id, newRequest);
    return newRequest;
  }
  
  async updateFaucetRequest(id: number, status: string, txHash?: string): Promise<FaucetRequest | undefined> {
    const request = this.faucetRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { 
      ...request, 
      status, 
      ...(txHash && { txHash }),
    };
    this.faucetRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  async getFaucetRequestsByAddress(address: string): Promise<FaucetRequest[]> {
    return Array.from(this.faucetRequests.values())
      .filter(request => request.address === address)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
  }
  
  // Dashboard operations (return mock data for now)
  async getTopHolders(limit: number): Promise<any[]> {
    return [
      { rank: 1, address: "0xfd1242a7bf21e5eDE5fba4F32C455C5a306E3921", balance: "1,245,672", percentage: "22.9%" },
      { rank: 2, address: "0x7ab3c4D531a2c34f40a7B947A78B0f2F40aF40A", balance: "842,310", percentage: "15.5%" },
      { rank: 3, address: "0x3ae54a6C3e51deA886a817fdFc98E98BC", balance: "532,789", percentage: "9.8%" },
      { rank: 4, address: "0x9df1a4C3e51deA886a817BfC14a5C276", balance: "428,135", percentage: "7.9%" },
      { rank: 5, address: "0x2c87d4C3e51deA886a817ff4d5f4e53f", balance: "387,492", percentage: "7.1%" }
    ].slice(0, limit);
  }
  
  async getRecentTransactions(limit: number): Promise<any[]> {
    return [
      { hash: "0x7d5c28a9f9beb5cc417c54b28cc6c96b87b6cd32b150a415814cbf02a7439cb6", type: "transfer", amount: "25.00", timestamp: Date.now() - 120000 },
      { hash: "0x3a1b28a9f9beb5cc417c54b28cc6c96b87b6cd32b150a415814cbf02a7439f27d", type: "mint", amount: "1,000.00", timestamp: Date.now() - 840000 },
      { hash: "0x94e228a9f9beb5cc417c54b28cc6c96b87b6cd32b150a415814cbf02a7439d81c", type: "transfer", amount: "512.50", timestamp: Date.now() - 2580000 },
      { hash: "0x61a928a9f9beb5cc417c54b28cc6c96b87b6cd32b150a415814cbf02a7439b35e", type: "burn", amount: "750.00", timestamp: Date.now() - 3600000 },
      { hash: "0x8fc328a9f9beb5cc417c54b28cc6c96b87b6cd32b150a415814cbf02a743912ad", type: "transfer", amount: "103.75", timestamp: Date.now() - 7200000 }
    ].slice(0, limit);
  }
  
  async getTokenDistribution(): Promise<any> {
    return {
      holdings: {
        exchanges: 45,
        daos: 20,
        wallets: 30,
        other: 5
      },
      issuanceBurn: {
        dates: ["Jun 1", "Jun 7", "Jun 14", "Jun 21", "Jun 28", "Jul 5", "Jul 12"],
        issuance: [50000, 70000, 55000, 85000, 65000, 90000, 95000],
        burns: [30000, 35000, 45000, 40000, 35000, 50000, 30000]
      }
    };
  }
  
  async getActivityData(): Promise<any> {
    return {
      daily: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: Math.floor(Math.random() * 500000) + 300000,
        count: Math.floor(Math.random() * 1000) + 500
      })).reverse(),
      weekly: Array.from({ length: 4 }, (_, i) => ({
        date: `Week ${i+1}`,
        volume: Math.floor(Math.random() * 2000000) + 1000000,
        count: Math.floor(Math.random() * 5000) + 2000
      })).reverse(),
      monthly: Array.from({ length: 3 }, (_, i) => ({
        date: new Date(Date.now() - i * 30 * 86400000).toLocaleDateString('en-US', { month: 'long' }),
        volume: Math.floor(Math.random() * 8000000) + 3000000,
        count: Math.floor(Math.random() * 20000) + 10000
      })).reverse(),
      all: Array.from({ length: 12 }, (_, i) => ({
        date: new Date(Date.now() - i * 30 * 86400000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        volume: Math.floor(Math.random() * 10000000) + 5000000,
        count: Math.floor(Math.random() * 50000) + 20000
      })).reverse()
    };
  }
}

export const storage = new MemStorage();
