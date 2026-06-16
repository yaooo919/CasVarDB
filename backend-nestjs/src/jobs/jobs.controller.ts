import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { getClientIp } from "../http/client-ip";
import { SubqueueRoute } from "../logging/subqueue-route.decorator";
import { ExportJobRequestDto } from "./jobs.dto";
import { JobCreateResponse, JobResponse } from "./jobs.types";
import { JobsService } from "./jobs.service";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post("export")
  @SubqueueRoute()
  createExportJob(@Body() body: ExportJobRequestDto, @Req() request: FastifyRequest): Promise<JobCreateResponse> {
    return this.jobsService.createExportJob(body, getClientIp(request));
  }

  @Get(":id")
  getJob(@Param("id") id: string): Promise<JobResponse> {
    return this.jobsService.getJob(id);
  }

  @Get(":id/result")
  async getJobResult(@Param("id") id: string, @Res() reply: FastifyReply): Promise<void> {
    const { type, result } = await this.jobsService.getCompletedResult(id);

    if (type === "export") {
      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="selected_data.csv"')
        .send(result);
      return;
    }

    reply.header("Content-Type", "application/json; charset=utf-8").send(result);
  }
}
