import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { DownloadController } from "./download.controller";
import { DownloadService } from "./download.service";

@Module({
  imports: [DatabaseModule],
  controllers: [DownloadController],
  providers: [DownloadService],
  exports: [DownloadService]
})
export class DownloadModule {}
