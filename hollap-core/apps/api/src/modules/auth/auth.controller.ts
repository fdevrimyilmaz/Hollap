import type { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service";

class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.register(req.body);
      res.status(201).json(tokens);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.login(req.body);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refresh(req.body);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.body.refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const me = await authService.me(req.user.id);
      res.json(me);
    } catch (error) {
      next(error);
    }
  };

  oauthGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.oauthGoogle(req.body);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  };

  oauthApple = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.oauthApple(req.body);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
