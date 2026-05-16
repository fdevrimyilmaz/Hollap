import type { NextFunction, Request, Response } from "express";
import { teachersService } from "./teachers.service";

class TeachersController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const teachers = await teachersService.list(category);
      res.json(teachers);
    } catch (error) {
      next(error);
    }
  };

  upsertMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const profile = await teachersService.upsertMyProfile(req.user.id, req.body);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  getByTeacherUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await teachersService.getByTeacherUserId(
        String(req.params.teacherUserId),
        req.user?.id,
      );
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  getMyStripeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const status = await teachersService.getMyStripeStatus(req.user.id);
      res.json(status);
    } catch (error) {
      next(error);
    }
  };

  createMyStripeOnboardingLink = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const link = await teachersService.createMyStripeOnboardingLink(req.user.id);
      res.json(link);
    } catch (error) {
      next(error);
    }
  };
}

export const teachersController = new TeachersController();
