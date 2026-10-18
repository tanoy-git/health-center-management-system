import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client | null = null;
  private bucketName: string;
  private readonly localStorageDir = path.resolve(process.cwd(), 'uploads');
  private useMinio = false;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'aegis-medical-records',
    );
  }

  async onModuleInit() {
    // Ensure local directory exists
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }

    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const rawPort = this.configService.get<string | number>('MINIO_PORT');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const port = rawPort ? Number(rawPort) : (useSSL ? 443 : 9000);
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'aegis_minio_admin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'aegis_minio_secret_key');

    try {
      this.minioClient = new Minio.Client({
        endPoint: endpoint,
        port: port,
        useSSL: useSSL,
        accessKey: accessKey,
        secretKey: secretKey,
      });

      try {
        const exists = await this.minioClient.bucketExists(this.bucketName);
        if (!exists) {
          await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
          this.logger.log(`Created Storage bucket: ${this.bucketName}`);
        }
      } catch (bucketErr) {
        this.logger.warn(
          `Bucket check/create notice for "${this.bucketName}": ${bucketErr.message}. Continuing with configured bucket.`,
        );
      }

      this.useMinio = true;
      this.logger.log(`Initialized Storage client connected to ${endpoint}:${port} (SSL: ${useSSL})`);
    } catch (err) {
      this.logger.warn(
        `Storage service not reachable (${err.message}). Using local disk storage fallback at ${this.localStorageDir}`,
      );
      this.useMinio = false;
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'records',
  ): Promise<{ fileUrl: string; key: string; size: number }> {
    const ext = path.extname(originalName) || '.dat';
    const filename = `${folder}/${uuidv4()}${ext}`;

    if (this.useMinio && this.minioClient) {
      try {
        await this.minioClient.putObject(
          this.bucketName,
          filename,
          fileBuffer,
          fileBuffer.length,
          { 'Content-Type': mimeType },
        );
        const fileUrl = `/api/v1/storage/${encodeURIComponent(filename)}`;
        return { fileUrl, key: filename, size: fileBuffer.length };
      } catch (err) {
        this.logger.error(`MinIO upload failed, fallback to disk: ${err.message}`);
      }
    }

    // Local Disk Fallback
    const targetPath = path.join(this.localStorageDir, filename);
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, fileBuffer);
    const fileUrl = `/api/v1/storage/${encodeURIComponent(filename)}`;
    return { fileUrl, key: filename, size: fileBuffer.length };
  }

  async getFileStream(key: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    const ext = path.extname(key).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.dcm': 'application/dicom',
      '.json': 'application/json',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    if (this.useMinio && this.minioClient) {
      try {
        const stream = await this.minioClient.getObject(this.bucketName, key);
        return { stream, mimeType };
      } catch (err) {
        this.logger.warn(`MinIO getObject failed for ${key}: ${err.message}`);
      }
    }

    const localPath = path.join(this.localStorageDir, key);
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${key}`);
    }
    const stream = fs.createReadStream(localPath);
    return { stream, mimeType };
  }
}
