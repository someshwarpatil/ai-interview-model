import { storageBucket } from '@/config/database';
import { logger } from '@/utils/logger';

export interface IStorageService {
  saveFile(file: Buffer, filename: string): Promise<string>;
  getFileUrl(filename: string): Promise<string>;
  getFilePath(filename: string): string;
  deleteFile(filename: string): Promise<void>;
}

class FirebaseStorageService implements IStorageService {
  private readonly basePath = 'interviews';

  async saveFile(file: Buffer, filename: string): Promise<string> {
    const filePath = `${this.basePath}/${filename}`;
    const fileRef = storageBucket().file(filePath);

    await fileRef.save(file, {
      metadata: {
        contentType: this.getContentType(filename),
      },
    });

    logger.info(`File saved to Firebase Storage: ${filePath}`);
    return filePath;
  }

  async getFileUrl(filename: string): Promise<string> {
    const filePath = filename.startsWith(this.basePath)
      ? filename
      : `${this.basePath}/${filename}`;
    const fileRef = storageBucket().file(filePath);

    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return signedUrl;
  }

  getFilePath(filename: string): string {
    return filename.startsWith(this.basePath)
      ? filename
      : `${this.basePath}/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = filename.startsWith(this.basePath)
      ? filename
      : `${this.basePath}/${filename}`;
    try {
      await storageBucket().file(filePath).delete();
      logger.info(`File deleted from Firebase Storage: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error);
      throw error;
    }
  }

  private getContentType(filename: string): string {
    if (filename.endsWith('.webm')) return 'video/webm';
    if (filename.endsWith('.mp4')) return 'video/mp4';
    if (filename.endsWith('.ogg')) return 'video/ogg';
    if (filename.endsWith('.mov')) return 'video/quicktime';
    return 'application/octet-stream';
  }
}

export const storageService: IStorageService = new FirebaseStorageService();
