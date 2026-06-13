import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { QueueModule } from "../queue/queue.module";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService]
})
export class JobsModule {}
