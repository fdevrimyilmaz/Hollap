import multer from "multer";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { mediaController } from "./media.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const mediaRouter = Router();

mediaRouter.post(
  "/avatar",
  requireAuth,
  upload.single("avatar"),
  mediaController.uploadAvatar,
);
