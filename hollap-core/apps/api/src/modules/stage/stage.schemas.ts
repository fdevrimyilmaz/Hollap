import { z } from "zod";

export const createRoomSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});

export const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const roomParamsSchema = z.object({
  roomId: z.string().min(1),
});

export const micActionSchema = z.object({
  userId: z.string().min(1),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
