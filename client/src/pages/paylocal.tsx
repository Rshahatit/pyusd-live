import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PaymentForm from "@/components/paylocal/payment-form";
import PaymentStatus from "@/components/paylocal/payment-status";

interface PaymentRequest {
  recipient: string;
  amount: string;
  memo?: string;
  gasSpeed: 'fast' | 'optimal';
}

export default function PayLocal() {
  const [lastPayment, setLastPayment] = useState<PaymentRequest | null>(null);

  const { data: accountData } = useQuery({
    queryKey: ['/api/pay/account'],
  });

  const { data: transactionHistory } = useQuery({
    queryKey: ['/api/pay/history'],
  });

  const paymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentRequest) => {
      const res = await apiRequest('POST', '/api/pay/send', paymentData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pay/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pay/history'] });
    },
  });

  const faucetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/pay/faucet', {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pay/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pay/history'] });
    },
  });

  const handlePayment = (paymentData: PaymentRequest) => {
    setLastPayment(paymentData);
    paymentMutation.mutate(paymentData);
  };

  const handleFaucetRequest = () => {
    faucetMutation.mutate();
  };
  
  return (
    <section id="paylocal">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gas-Sponsored Checkout</h2>
        <p className="text-gray-600">Send PYUSD payments without paying for gas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PaymentForm 
          onSubmit={handlePayment} 
          isLoading={paymentMutation.isPending}
        />
        
        <PaymentStatus 
          account={accountData} 
          transactions={transactionHistory?.transactions || []} 
          onFaucetRequest={handleFaucetRequest}
          isRequestingFaucet={faucetMutation.isPending}
          lastPayment={lastPayment}
          paymentStatus={paymentMutation.status}
        />
      </div>
    </section>
  );
}
