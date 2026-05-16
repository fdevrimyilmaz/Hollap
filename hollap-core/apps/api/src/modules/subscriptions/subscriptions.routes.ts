import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { subscriptionsController } from "./subscriptions.controller";
import { checkoutSchema, mockConfirmSchema } from "./subscriptions.schemas";

export const subscriptionsRouter = Router();

subscriptionsRouter.post(
  "/checkout",
  requireAuth,
  requireRole(["STUDENT"]),
  validateBody(checkoutSchema),
  subscriptionsController.checkout,
);

subscriptionsRouter.post(
  "/mock/confirm",
  requireAuth,
  requireRole(["STUDENT"]),
  validateBody(mockConfirmSchema),
  subscriptionsController.mockConfirm,
);

subscriptionsRouter.get("/me", requireAuth, subscriptionsController.listMine);
subscriptionsRouter.get("/mock/success", (_req, res) => {
  res.json({ message: "Mock checkout completed. Confirm subscription via /mock/confirm." });
});
