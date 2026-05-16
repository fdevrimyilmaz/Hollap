import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { authController } from "./auth.controller";
import {
  loginSchema,
  oauthSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schemas";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), authController.register);
authRouter.post("/login", validateBody(loginSchema), authController.login);
authRouter.post("/refresh", validateBody(refreshSchema), authController.refresh);
authRouter.post("/logout", validateBody(refreshSchema), authController.logout);
authRouter.get("/me", requireAuth, authController.me);
authRouter.post(
  "/oauth/google",
  validateBody(oauthSchema),
  authController.oauthGoogle,
);
authRouter.post("/oauth/apple", validateBody(oauthSchema), authController.oauthApple);
