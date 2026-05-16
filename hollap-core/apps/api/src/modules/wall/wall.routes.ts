import multer from "multer";
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { wallController } from "./wall.controller";
import { questionSchema, replyMetaSchema } from "./wall.schemas";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const wallRouter = Router();

wallRouter.post(
  "/questions",
  requireAuth,
  requireRole(["TEACHER"]),
  validateBody(questionSchema),
  wallController.createQuestion,
);

wallRouter.get(
  "/teachers/:teacherUserId/questions",
  requireAuth,
  wallController.listQuestions,
);

wallRouter.get("/questions/:questionId/replies", requireAuth, wallController.listReplies);

wallRouter.post(
  "/questions/:questionId/replies",
  requireAuth,
  requireRole(["STUDENT"]),
  upload.single("audio"),
  validateBody(replyMetaSchema),
  wallController.createReply,
);

wallRouter.delete(
  "/replies/:replyId",
  requireAuth,
  requireRole(["TEACHER"]),
  wallController.deleteReply,
);
