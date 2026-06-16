import { BadRequestException, Controller, Get, Query, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { getClientIp } from "../http/client-ip";
import { JobCreateResponse } from "../jobs/jobs.types";
import { JobsService } from "../jobs/jobs.service";
import { SubqueueRoute } from "../logging/subqueue-route.decorator";
import { ActivityGraphQuery, StatisticsJobEndpoint, StatisticsJobResult } from "./statistics.types";

type StatisticsRouteResponse = Promise<JobCreateResponse | StatisticsJobResult>;

@Controller("statistics")
export class StatisticsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get("cas9-freq-per-variant")
  @SubqueueRoute()
  getCas9FreqPerVariant(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("cas9-freq-per-variant", request);
  }

  @Get("cas12-freq-per-variant")
  @SubqueueRoute()
  getCas12FreqPerVariant(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("cas12-freq-per-variant", request);
  }

  @Get("freq-per-scaffold")
  @SubqueueRoute()
  getFreqPerScaffold(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("freq-per-scaffold", request);
  }

  @Get("data-count-per-study")
  @SubqueueRoute()
  getDataCountPerStudy(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("data-count-per-study", request);
  }

  @Get("cas9-freq-per-mismatch")
  @SubqueueRoute()
  getCas9FreqPerMismatch(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("cas9-freq-per-mismatch", request);
  }

  @Get("cas12-freq-per-mismatch")
  @SubqueueRoute()
  getCas12FreqPerMismatch(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("cas12-freq-per-mismatch", request);
  }

  @Get("freq-mismatch-per-variant")
  @SubqueueRoute()
  getFreqMismatchPerVariant(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("freq-mismatch-per-variant", request);
  }

  @Get("heatmap-data")
  @SubqueueRoute()
  getHeatmapData(@Req() request: FastifyRequest): StatisticsRouteResponse {
    return this.enqueueStatisticsJob("heatmap-data", request);
  }

  @Get("activity-graph")
  @SubqueueRoute()
  getActivityGraph(
    @Req() request: FastifyRequest,
    @Query("pam") pam?: string,
    @Query("numberOfMismatches") numberOfMismatches?: string,
    @Query("variant") variant?: string,
    @Query("mismatchPosition") mismatchPosition?: string,
    @Query("countOnly") countOnly?: string
  ): StatisticsRouteResponse {
    if (!pam || numberOfMismatches === undefined || !variant) {
      throw new BadRequestException("Missing required query parameters");
    }

    const query: ActivityGraphQuery = {
      pam,
      numberOfMismatches,
      variant,
      mismatchPosition,
      countOnly: countOnly === "true"
    };

    return this.enqueueStatisticsJob("activity-graph", request, query);
  }

  private enqueueStatisticsJob(
    endpoint: StatisticsJobEndpoint,
    request: FastifyRequest,
    query?: ActivityGraphQuery
  ): StatisticsRouteResponse {
    return this.jobsService.createStatisticsJob({ endpoint, query }, getClientIp(request));
  }
}
