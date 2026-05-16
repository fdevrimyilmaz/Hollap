import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { subscriptionsService } from "./subscriptions.service";

class SubscriptionsController {
  checkout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }

      const result = await subscriptionsService.createCheckout(req.user.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  mockConfirm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }

      const result = await subscriptionsService.mockConfirm(
        req.body.subscriptionId,
        req.user.id,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const list = await subscriptionsService.listMine(req.user.id);
      res.json(list);
    } catch (error) {
      next(error);
    }
  };

  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers["stripe-signature"];
      await subscriptionsService.handleWebhook(req.body, signature);
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  };
}

export const subscriptionsController = new SubscriptionsController();
