import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { stageController } from "./stage.controller";
import { createRoomSchema, noteSchema } from "./stage.schemas";

export const stageRouter = Router();

stageRouter.get(
  "/teachers/me/rooms",
  requireAuth,
  requireRole(["TEACHER"]),
  stageController.listMyRooms,
);
stageRouter.get(
  "/teachers/:teacherUserId/rooms",
  requireAuth,
  stageController.listTeacherRoomsForViewer,
);

stageRouter.post(
  "/rooms",
  requireAuth,
  requireRole(["TEACHER"]),
  validateBody(createRoomSchema),
  stageController.createRoom,
);

stageRouter.get("/rooms/:roomId", requireAuth, stageController.getRoom);
stageRouter.post(
  "/rooms/:roomId/notes",
  requireAuth,
  validateBody(noteSchema),
  stageController.addNote,
);
stageRouter.get("/rooms/:roomId/notes", requireAuth, stageController.listNotes);
stageRouter.get(
  "/rooms/:roomId/notes/export.txt",
  requireAuth,
  stageController.exportNotesText,
);
stageRouter.get(
  "/rooms/:roomId/mic-requests",
  requireAuth,
  requireRole(["TEACHER", "ASSISTANT"]),
  stageController.listPendingRequests,
);
stageRouter.post(
  "/rooms/:roomId/end",
  requireAuth,
  requireRole(["TEACHER"]),
  stageController.endRoom,
);
