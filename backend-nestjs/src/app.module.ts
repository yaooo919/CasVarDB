import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { DataModule } from "./data/data.module";
import { DatabaseModule } from "./database/database.module";
import { DownloadModule } from "./download/download.module";
import { GrnaModule } from "./grna/grna.module";
import { JobsModule } from "./jobs/jobs.module";
import { QueueModule } from "./queue/queue.module";
import { StatisticsModule } from "./statistics/statistics.module";
import { SubmitModule } from "./submit/submit.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    QueueModule,
    DataModule,
    GrnaModule,
    DownloadModule,
    JobsModule,
    StatisticsModule,
    SubmitModule
  ]
})
export class AppModule {}
