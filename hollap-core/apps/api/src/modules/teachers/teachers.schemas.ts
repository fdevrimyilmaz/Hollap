import { z } from "zod";

export const teacherProfileSchema = z.object({
  bio: z.string().min(10),
  profilePhotoUrl: z.string().url().optional(),
  category: z.string().default("Borsa & Finans"),
  priceMonthly: z.number().int().positive(),
  assistantIds: z.array(z.string()).max(2).default([]),
});

export type TeacherProfileInput = z.infer<typeof teacherProfileSchema>;
