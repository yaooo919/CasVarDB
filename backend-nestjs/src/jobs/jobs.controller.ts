import { Body, Controller, Get, Header, Param, Post, Res } from "@nestjs/common";
import { FastifyReply } from "fastify";
import { ExportJobRequestDto } from "./jobs.dto";
import { JobResponse } from "./jobs.types";
import { JobsService } from "./jobs.service";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post("export")
  createExportJob(@Body() body: ExportJobRequestDto): Promise<{ id: string; status: "queued" }> {
    return this.jobsService.createExportJob(body);
  }

  @Get(":id")
  getJob(@Param("id") id: string): Promise<JobResponse> {
    return this.jobsService.getJob(id);
  }

  @Get(":id/result")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async getJobResult(@Param("id") id: string, @Res() reply: FastifyReply): Promise<void> {
    const csv = await this.jobsService.getCompletedResult(id);
    reply.header("Content-Disposition", 'attachment; filename="selected_data.csv"').send(csv);
  }
}
