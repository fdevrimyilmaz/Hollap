import { Router } from "express";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { teachersController } from "./teachers.controller";
import { teacherProfileSchema } from "./teachers.schemas";

export const teachersRouter = Router();

teachersRouter.get("/", teachersController.list);
teachersRouter.get(
  "/me/stripe/status",
  requireAuth,
  requireRole(["TEACHER"]),
  teachersController.getMyStripeStatus,
);
teachersRouter.post(
  "/me/stripe/onboarding-link",
  requireAuth,
  requireRole(["TEACHER"]),
  teachersController.createMyStripeOnboardingLink,
);
teachersRouter.get("/:teacherUserId", optionalAuth, teachersController.getByTeacherUserId);
teachersRouter.put(
  "/me/profile",
  requireAuth,
  requireRole(["TEACHER"]),
  validateBody(teacherProfileSchema),
  teachersController.upsertMyProfile,
);
