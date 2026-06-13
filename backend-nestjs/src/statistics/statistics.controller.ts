import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { StatisticsService } from "./statistics.service";

@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("cas9-freq-per-variant")
  getCas9FreqPerVariant() {
    return this.statisticsService.getCas9FreqPerVariant();
  }

  @Get("cas12-freq-per-variant")
  getCas12FreqPerVariant() {
    return this.statisticsService.getCas12FreqPerVariant();
  }

  @Get("freq-per-scaffold")
  getFreqPerScaffold() {
    return this.statisticsService.getFreqPerScaffold();
  }

  @Get("data-count-per-study")
  getDataCountPerStudy() {
    return this.statisticsService.getDataCountPerStudy();
  }

  @Get("cas9-freq-per-mismatch")
  getCas9FreqPerMismatch() {
    return this.statisticsService.getCas9FreqPerMismatch();
  }

  @Get("cas12-freq-per-mismatch")
  getCas12FreqPerMismatch() {
    return this.statisticsService.getCas12FreqPerMismatch();
  }

  @Get("freq-mismatch-per-variant")
  getFreqMismatchPerVariant() {
    return this.statisticsService.getFreqMismatchPerVariant();
  }

  @Get("heatmap-data")
  getHeatmapData() {
    return this.statisticsService.getHeatmapData();
  }

  @Get("activity-graph")
  getActivityGraph(
    @Query("pam") pam?: string,
    @Query("numberOfMismatches") numberOfMismatches?: string,
    @Query("variant") variant?: string,
    @Query("mismatchPosition") mismatchPosition?: string,
    @Query("countOnly") countOnly?: string
  ) {
    if (!pam || numberOfMismatches === undefined || !variant) {
      throw new BadRequestException("Missing required query parameters");
    }

    return this.statisticsService.getActivityGraph({
      pam,
      numberOfMismatches,
      variant,
      mismatchPosition,
      countOnly: countOnly === "true"
    });
  }
}
