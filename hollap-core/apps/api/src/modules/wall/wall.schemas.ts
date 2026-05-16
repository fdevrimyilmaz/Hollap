import { z } from "zod";

export const questionSchema = z.object({
  questionText: z.string().min(5).max(280),
});

export const replyMetaSchema = z.object({
  durationSec: z.coerce.number().int().positive().max(60),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type ReplyMetaInput = z.infer<typeof replyMetaSchema>;
