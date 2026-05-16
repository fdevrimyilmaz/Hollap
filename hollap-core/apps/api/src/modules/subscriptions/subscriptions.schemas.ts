import { z } from "zod";

export const checkoutSchema = z.object({
  teacherUserId: z.string().min(1),
});

export const mockConfirmSchema = z.object({
  subscriptionId: z.string().min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type MockConfirmInput = z.infer<typeof mockConfirmSchema>;
