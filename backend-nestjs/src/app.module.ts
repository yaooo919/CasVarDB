import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { DownloadModule } from "./download/download.module";
import { GrnaModule } from "./grna/grna.module";
import { JobsModule } from "./jobs/jobs.module";
import { ApiRequestLoggingInterceptor } from "./logging/api-request-logging.interceptor";
import { QueueModule } from "./queue/queue.module";
import { StatisticsModule } from "./statistics/statistics.module";
import { SubmitModule } from "./submit/submit.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    QueueModule,
    GrnaModule,
    DownloadModule,
    JobsModule,
    StatisticsModule,
    SubmitModule
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiRequestLoggingInterceptor
    }
  ]
})
export class AppModule {}
