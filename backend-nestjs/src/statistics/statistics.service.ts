import { Injectable } from "@nestjs/common";
import { RowDataPacket } from "mysql2/promise";
import { DatabaseService, SqlParam } from "../database/database.service";
import {
  ActivityGraphQuery,
  ActivityGraphResponse,
  CountPerStudyResponse,
  FrequencyMismatchPerVariantResponse,
  FrequencyPerMismatchResponse,
  HeatmapResponse,
  StatisticsJobEndpoint,
  StatisticsJobResult,
  SummaryStats,
  SummaryStatsResponse
} from "./statistics.types";

interface VariantFrequencyRow extends RowDataPacket {
  variant: string;
  mean_background_subtracted_indel_frequency: number;
}

interface ScaffoldFrequencyRow extends RowDataPacket {
  gRNA_scaffold: string;
  mean_background_subtracted_indel_frequency: number;
}

interface StudyRow extends RowDataPacket {
  study: string | null;
}

interface MismatchFrequencyRow extends RowDataPacket {
  number_of_mismatches: number;
  mean_background_subtracted_indel_frequency: number;
}

interface VariantMismatchFrequencyRow extends MismatchFrequencyRow {
  variant: string;
}

interface ActivityGraphDataRow extends RowDataPacket {
  variant: string;
  mean_background_subtracted_indel_frequency: number;
}

interface ActivityGraphCountRow extends RowDataPacket {
  datapoint_count: number;
}

interface HeatmapAggregateRow extends RowDataPacket {
  mismatch_position: number;
  raw_frequency: number;
  variant: string;
}

interface OnTargetActivityRow extends RowDataPacket {
  on_target_activity: number;
  variant: string;
}

const iupacRegexMap: Record<string, string> = {
  A: "A",
  T: "T",
  C: "C",
  G: "G",
  R: "[AG]",
  Y: "[CT]",
  S: "[GC]",
  W: "[AT]",
  K: "[GT]",
  M: "[AC]",
  B: "[CGT]",
  D: "[AGT]",
  H: "[ACT]",
  V: "[ACG]",
  N: "[ATCG]"
};

@Injectable()
export class StatisticsService {
  constructor(private readonly database: DatabaseService) {}

  async runStatisticsJob(endpoint: StatisticsJobEndpoint, query?: ActivityGraphQuery): Promise<StatisticsJobResult> {
    switch (endpoint) {
      case "cas9-freq-per-variant":
        return this.getCas9FreqPerVariant();
      case "cas12-freq-per-variant":
        return this.getCas12FreqPerVariant();
      case "freq-per-scaffold":
        return this.getFreqPerScaffold();
      case "data-count-per-study":
        return this.getDataCountPerStudy();
      case "cas9-freq-per-mismatch":
        return this.getCas9FreqPerMismatch();
      case "cas12-freq-per-mismatch":
        return this.getCas12FreqPerMismatch();
      case "freq-mismatch-per-variant":
        return this.getFreqMismatchPerVariant();
      case "heatmap-data":
        return this.getHeatmapData();
      case "activity-graph":
        if (!query) {
          throw new Error("activity-graph statistics job requires query payload");
        }
        return this.getActivityGraph(query);
      default:
        return this.assertNever();
    }
  }

  async getCas9FreqPerVariant(): Promise<SummaryStatsResponse> {
    const rows = await this.database.query<VariantFrequencyRow[]>(`
      SELECT variant, mean_background_subtracted_indel_frequency
      FROM cas9
    `);

    return this.processFreqPerVariantData(rows);
  }

  async getCas12FreqPerVariant(): Promise<SummaryStatsResponse> {
    const rows = await this.database.query<VariantFrequencyRow[]>(`
      SELECT variant, mean_background_subtracted_indel_frequency
      FROM cas12
    `);

    return this.processFreqPerVariantData(rows);
  }

  async getFreqPerScaffold(): Promise<SummaryStatsResponse> {
    const rows = await this.database.query<ScaffoldFrequencyRow[]>(`
      SELECT gRNA_scaffold, mean_background_subtracted_indel_frequency
      FROM cas9

      UNION ALL

      SELECT gRNA_scaffold, mean_background_subtracted_indel_frequency
      FROM cas12
    `);

    return this.processFreqPerScaffoldData(rows);
  }

  async getDataCountPerStudy(): Promise<CountPerStudyResponse> {
    const rows = await this.database.query<StudyRow[]>(`
      SELECT study
      FROM cas9

      UNION ALL

      SELECT study
      FROM cas12
    `);

    return this.processDataCountPerStudy(rows);
  }

  async getCas9FreqPerMismatch(): Promise<FrequencyPerMismatchResponse> {
    const rows = await this.database.query<MismatchFrequencyRow[]>(`
      SELECT number_of_mismatches, mean_background_subtracted_indel_frequency
      FROM cas9
    `);

    return this.processFreqPerMismatchData(rows);
  }

  async getCas12FreqPerMismatch(): Promise<FrequencyPerMismatchResponse> {
    const rows = await this.database.query<MismatchFrequencyRow[]>(`
      SELECT number_of_mismatches, mean_background_subtracted_indel_frequency
      FROM cas12
    `);

    return this.processFreqPerMismatchData(rows);
  }

  async getFreqMismatchPerVariant(): Promise<FrequencyMismatchPerVariantResponse> {
    const rows = await this.database.query<VariantMismatchFrequencyRow[]>(`
      SELECT variant, number_of_mismatches, mean_background_subtracted_indel_frequency
      FROM cas9
    `);

    return this.processFreqMismatchPerVariantData(rows);
  }

  async getHeatmapData(): Promise<HeatmapResponse> {
    const onTargetRows = await this.database.query<OnTargetActivityRow[]>(`
      SELECT variant, AVG(mean_background_subtracted_indel_frequency) AS on_target_activity
      FROM (
        SELECT variant, mean_background_subtracted_indel_frequency
        FROM cas9
        WHERE number_of_mismatches = 0

        UNION ALL

        SELECT variant, mean_background_subtracted_indel_frequency
        FROM cas12
        WHERE number_of_mismatches = 0
      ) on_target
      GROUP BY variant
    `);

    const heatmapRows = await this.database.query<HeatmapAggregateRow[]>(`
      SELECT variant, mismatch_position, AVG(mean_background_subtracted_indel_frequency) AS raw_frequency
      FROM (
        SELECT
          variant,
          CAST(JSON_UNQUOTE(JSON_EXTRACT(mismatch_positions, '$[0]')) AS UNSIGNED) - 1 AS mismatch_position,
          mean_background_subtracted_indel_frequency
        FROM cas9
        WHERE number_of_mismatches = 1 AND JSON_VALID(mismatch_positions)

        UNION ALL

        SELECT
          variant,
          CAST(JSON_UNQUOTE(JSON_EXTRACT(mismatch_positions, '$[0]')) AS UNSIGNED) - 1 AS mismatch_position,
          mean_background_subtracted_indel_frequency
        FROM cas12
        WHERE number_of_mismatches = 1 AND JSON_VALID(mismatch_positions)
      ) single_mismatch
      WHERE mismatch_position IS NOT NULL
      GROUP BY variant, mismatch_position
    `);

    return this.processHeatmapData(onTargetRows, heatmapRows);
  }

  async getActivityGraph(query: ActivityGraphQuery): Promise<ActivityGraphResponse> {
    const pamLength = query.pam.length;
    const regexPattern = this.convertIupacToRegex(query.pam);
    const tables = [
      { table: "cas9", pamStart: 28 },
      { table: "cas12", pamStart: 5 }
    ] as const;

    const results = await Promise.all(
      tables.map(({ table, pamStart }) => {
        const selectClause = query.countOnly
          ? "COUNT(*) AS datapoint_count"
          : "variant, mean_background_subtracted_indel_frequency";
        const params: SqlParam[] = [
          pamStart,
          pamLength,
          `^${regexPattern}$`,
          query.numberOfMismatches,
          query.variant
        ];

        let sql = `
          SELECT ${selectClause}
          FROM ${table}
          WHERE
            SUBSTRING(target_context_sequence FROM ? FOR ?) REGEXP ?
            AND number_of_mismatches = ?
            AND variant = ?
        `;

        if (Number(query.numberOfMismatches) === 1 && query.mismatchPosition) {
          sql += " AND mismatch_positions = ?";
          params.push(query.mismatchPosition);
        }

        if (query.countOnly) {
          return this.database.query<ActivityGraphCountRow[]>(sql, params);
        }

        return this.database.query<ActivityGraphDataRow[]>(sql, params);
      })
    );

    const allRows = results.flat();

    if (query.countOnly) {
      const totalCount = (allRows as ActivityGraphCountRow[]).reduce((sum, row) => {
        return sum + Number(row.datapoint_count || 0);
      }, 0);

      return { [query.variant]: totalCount };
    }

    return (allRows as ActivityGraphDataRow[]).reduce<ActivityGraphResponse>((acc, row) => {
      const values = acc[row.variant];
      if (Array.isArray(values)) {
        values.push(Number(row.mean_background_subtracted_indel_frequency));
      } else {
        acc[row.variant] = [Number(row.mean_background_subtracted_indel_frequency)];
      }

      return acc;
    }, {});
  }

  private calculateStats(data: number[]): SummaryStats {
    const sortedData = data.slice().sort((a, b) => a - b);
    const min = sortedData[0];
    const max = sortedData[sortedData.length - 1];
    const mean = sortedData.reduce((sum, value) => sum + value, 0) / sortedData.length;
    const median = this.calculatePercentile(sortedData, 0.5);
    const q1 = this.calculatePercentile(sortedData, 0.25);
    const q3 = this.calculatePercentile(sortedData, 0.75);

    return { min, max, mean, median, q1, q3 };
  }

  private calculatePercentile(sortedData: number[], percentile: number): number {
    const index = percentile * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
      return sortedData[lower];
    }

    return sortedData[lower] + (sortedData[upper] - sortedData[lower]) * (index - lower);
  }

  private processFreqPerVariantData(rows: VariantFrequencyRow[]): SummaryStatsResponse {
    const groupedData: Record<string, number[]> = {};

    rows.forEach((row) => {
      if (!groupedData[row.variant]) {
        groupedData[row.variant] = [];
      }
      groupedData[row.variant].push(Number(row.mean_background_subtracted_indel_frequency));
    });

    return Object.keys(groupedData).reduce<SummaryStatsResponse>((acc, variant) => {
      acc[variant] = this.calculateStats(groupedData[variant]);
      return acc;
    }, {});
  }

  private processFreqPerScaffoldData(rows: ScaffoldFrequencyRow[]): SummaryStatsResponse {
    const groupedData: Record<string, number[]> = {};

    rows.forEach((row) => {
      if (!groupedData[row.gRNA_scaffold]) {
        groupedData[row.gRNA_scaffold] = [];
      }
      groupedData[row.gRNA_scaffold].push(Number(row.mean_background_subtracted_indel_frequency));
    });

    return Object.keys(groupedData).reduce<SummaryStatsResponse>((acc, scaffold) => {
      acc[scaffold] = this.calculateStats(groupedData[scaffold]);
      return acc;
    }, {});
  }

  private processDataCountPerStudy(rows: StudyRow[]): CountPerStudyResponse {
    return rows.reduce<CountPerStudyResponse>((acc, item) => {
      const study = JSON.stringify(item.study).replace(/"\['xCas9_NG', 'xCas9_NG'\]"/, "\"['xCas9_NG']\"");
      acc[study] = (acc[study] ?? 0) + 1;
      return acc;
    }, {});
  }

  private processFreqPerMismatchData(rows: MismatchFrequencyRow[]): FrequencyPerMismatchResponse {
    const groupedData = rows.reduce<Record<string, number[]>>((acc, row) => {
      const key = String(row.number_of_mismatches);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(Number(row.mean_background_subtracted_indel_frequency));
      return acc;
    }, {});

    return Object.keys(groupedData).reduce<FrequencyPerMismatchResponse>((acc, key) => {
      const values = groupedData[key];
      acc[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
      return acc;
    }, {});
  }

  private processFreqMismatchPerVariantData(rows: VariantMismatchFrequencyRow[]): FrequencyMismatchPerVariantResponse {
    const variantData = rows.reduce<Record<string, Record<string, number[]>>>((acc, row) => {
      const mismatchCount = String(row.number_of_mismatches);
      if (!acc[row.variant]) {
        acc[row.variant] = {};
      }
      if (!acc[row.variant][mismatchCount]) {
        acc[row.variant][mismatchCount] = [];
      }
      acc[row.variant][mismatchCount].push(Number(row.mean_background_subtracted_indel_frequency));

      return acc;
    }, {});

    return Object.keys(variantData).map((variant) => {
      const averageFreqPerMismatch: Record<string, number | string> = { variant };
      Object.keys(variantData[variant]).forEach((mismatchCount) => {
        const frequencies = variantData[variant][mismatchCount];
        averageFreqPerMismatch[mismatchCount] = frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length;
      });

      return averageFreqPerMismatch;
    });
  }

  private processHeatmapData(onTargetRows: OnTargetActivityRow[], heatmapRows: HeatmapAggregateRow[]): HeatmapResponse {
    const onTargetActivity = onTargetRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.variant] = Number(row.on_target_activity);
      return acc;
    }, {});
    const heatmapData: HeatmapResponse = {};

    heatmapRows.forEach((row) => {
      const variant = row.variant;
      const activity = onTargetActivity[variant];
      const raw = Number(row.raw_frequency);
      const mismatchPosition = Number(row.mismatch_position);

      if (!Number.isFinite(activity) || !Number.isFinite(raw) || !Number.isFinite(mismatchPosition)) {
        return;
      }

      if (!heatmapData[variant]) {
        heatmapData[variant] = {};
      }

      heatmapData[variant][String(mismatchPosition)] = {
        raw,
        normalized: activity === 0 ? 0 : raw / activity
      };
    });

    return heatmapData;
  }

  private convertIupacToRegex(pam: string): string {
    return pam
      .toUpperCase()
      .split("")
      .map((char) => iupacRegexMap[char] ?? char)
      .join("");
  }

  private assertNever(): never {
    throw new Error("Unsupported statistics endpoint");
  }
}
