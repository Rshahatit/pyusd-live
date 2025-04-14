import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { Loader2 } from "lucide-react";

// Define form schema with zod
const formSchema = z.object({
  recipient: z.string()
    .min(1, { message: "Recipient address is required" })
    .regex(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address format" }),
  amount: z.string()
    .min(1, { message: "Amount is required" })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  memo: z.string().optional(),
  gasSpeed: z.enum(["fast", "optimal"]),
});

export type PaymentFormValues = z.infer<typeof formSchema>;

interface PaymentFormProps {
  onSubmit: (values: PaymentFormValues) => void;
  isLoading?: boolean;
}

export default function PaymentForm({ onSubmit, isLoading = false }: PaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      amount: "",
      memo: "",
      gasSpeed: "fast",
    },
  });

  const handleSubmit = (values: PaymentFormValues) => {
    onSubmit(values);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Make a Payment</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient Address</FormLabel>
                <FormControl>
                  <Input placeholder="0x..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (PYUSD)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      min="0.01" 
                      step="0.01"
                      className="pl-8"
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Memo (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="What's this payment for?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="gasSpeed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gas Optimization</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fast" id="speed-fast" />
                      <label htmlFor="speed-fast" className="text-sm text-gray-700">
                        Fast
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="optimal" id="speed-optimal" />
                      <label htmlFor="speed-optimal" className="text-sm text-gray-700">
                        Optimal
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-blue-600 mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Send Payment"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
