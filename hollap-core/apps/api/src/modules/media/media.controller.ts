import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { mediaService } from "./media.service";

class MediaController {
  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const result = await mediaService.uploadAvatar(req.user.id, req.file);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const mediaController = new MediaController();
