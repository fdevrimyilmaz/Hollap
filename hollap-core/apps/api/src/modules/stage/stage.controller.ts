import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { stageService } from "./stage.service";

class StageController {
  listTeacherRoomsForViewer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const rooms = await stageService.listTeacherRoomsForViewer(
        String(req.params.teacherUserId),
        req.user.id,
      );
      res.json(rooms);
    } catch (error) {
      next(error);
    }
  };

  listMyRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const rooms = await stageService.listMyRooms(req.user.id);
      res.json(rooms);
    } catch (error) {
      next(error);
    }
  };

  createRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const room = await stageService.createRoom(req.user.id, req.body);
      res.status(201).json(room);
    } catch (error) {
      next(error);
    }
  };

  getRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const room = await stageService.getRoom(String(req.params.roomId), req.user.id);
      res.json(room);
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const note = await stageService.addNote(
        String(req.params.roomId),
        req.user.id,
        req.body,
      );
      res.status(201).json(note);
    } catch (error) {
      next(error);
    }
  };

  listNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const notes = await stageService.listNotes(String(req.params.roomId), req.user.id);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  };

  exportNotesText = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }

      const roomId = String(req.params.roomId);
      const text = await stageService.exportNotesAsText(roomId, req.user.id);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="hollap-room-${roomId}-notes.txt"`,
      );
      res.send(text);
    } catch (error) {
      next(error);
    }
  };

  listPendingRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const requests = await stageService.listPendingMicRequests(
        String(req.params.roomId),
        req.user.id,
      );
      res.json(requests);
    } catch (error) {
      next(error);
    }
  };

  endRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Unauthorized");
      }
      const room = await stageService.endRoom(String(req.params.roomId), req.user.id);
      res.json(room);
    } catch (error) {
      next(error);
    }
  };
}

export const stageController = new StageController();
