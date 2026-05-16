import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { wallService } from "./wall.service";

class WallController {
  createQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const question = await wallService.createQuestion(req.user.id, req.body);
      res.status(201).json(question);
    } catch (error) {
      next(error);
    }
  };

  listQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const list = await wallService.listQuestionsByTeacher(
        String(req.params.teacherUserId),
        req.user.id,
      );
      res.json(list);
    } catch (error) {
      next(error);
    }
  };

  createReply = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const reply = await wallService.createReply(
        String(req.params.questionId),
        req.user.id,
        req.body,
        req.file,
      );
      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  };

  listReplies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const replies = await wallService.listReplies(
        String(req.params.questionId),
        req.user.id,
      );
      res.json(replies);
    } catch (error) {
      next(error);
    }
  };

  deleteReply = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      await wallService.deleteReply(String(req.params.replyId), req.user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export const wallController = new WallController();
