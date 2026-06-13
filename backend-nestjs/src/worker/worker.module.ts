import { Module } from "@nestjs/common";
import { AppConfigModule } from "../config/config.module";
import { DatabaseModule } from "../database/database.module";
import { DownloadModule } from "../download/download.module";
import { JobsModule } from "../jobs/jobs.module";
import { QueueModule } from "../queue/queue.module";
import { WorkerRuntimeService } from "./worker-runtime.service";
import { WorkerService } from "./worker.service";

@Module({
  imports: [AppConfigModule, DatabaseModule, DownloadModule, JobsModule, QueueModule],
  providers: [WorkerService, WorkerRuntimeService],
  exports: [WorkerService]
})
export class WorkerModule {}
