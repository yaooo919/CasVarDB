import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { JobsModule } from "../jobs/jobs.module";
import { StatisticsController } from "./statistics.controller";
import { StatisticsService } from "./statistics.service";

@Module({
  imports: [DatabaseModule, JobsModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService]
})
export class StatisticsModule {}
