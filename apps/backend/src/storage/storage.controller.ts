import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { Public } from '../common/decorators';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: any) {
    if (!file) {
      throw new NotFoundException('No file provided');
    }
    return this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'clinical',
    );
  }

  @Public()
  @Get(':key')
  async getFile(@Param('key') key: string, @Res() res: Response) {
    try {
      const decodedKey = decodeURIComponent(key);
      const { stream, mimeType } = await this.storageService.getFileStream(
        decodedKey,
      );
      res.setHeader('Content-Type', mimeType);
      stream.pipe(res);
    } catch (err) {
      throw new NotFoundException('File not found');
    }
  }
}
