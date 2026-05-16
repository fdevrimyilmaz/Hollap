import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import { uploadBufferToStorage } from "../../lib/storage";

class MediaService {
  async uploadAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new HttpError(400, "Avatar file is required");
    }

    const key = `users/${userId}/avatar-${Date.now()}`;
    const avatarUrl = await uploadBufferToStorage({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
      },
    });

    return { avatarUrl };
  }
}

export const mediaService = new MediaService();
