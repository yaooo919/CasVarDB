import { Injectable } from "@nestjs/common";
import { RowDataPacket } from "mysql2/promise";
import { DatabaseService, SqlParam } from "../database/database.service";

type SummaryStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
};

type SummaryStatsResponse = Record<string, SummaryStats>;
type CountPerStudyResponse = Record<string, number>;
type FrequencyPerMismatchResponse = Record<string, number>;
type FrequencyMismatchPerVariantResponse = Array<Record<string, number | string>>;
type HeatmapResponse = Record<string, Record<string, { raw: number; normalized: number }>>;
type ActivityGraphResponse = Record<string, number | number[]>;

type ActivityGraphQuery = {
  pam: string;
  numberOfMismatches: string;
  variant: string;
  mismatchPosition?: string;
  countOnly: boolean;
};

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

interface HeatmapRow extends VariantMismatchFrequencyRow {
  mismatch_positions: string;
}

interface ActivityGraphDataRow extends RowDataPacket {
  variant: string;
  mean_background_subtracted_indel_frequency: number;
}

interface ActivityGraphCountRow extends RowDataPacket {
  datapoint_count: number;
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
    const rows = await this.database.query<HeatmapRow[]>(`
      SELECT number_of_mismatches, variant, mean_background_subtracted_indel_frequency, mismatch_positions
      FROM cas9
      WHERE number_of_mismatches = 0 OR number_of_mismatches = 1

      UNION ALL

      SELECT number_of_mismatches, variant, mean_background_subtracted_indel_frequency, mismatch_positions
      FROM cas12
      WHERE number_of_mismatches = 0 OR number_of_mismatches = 1
    `);

    return this.processHeatmapData(rows);
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

  private processHeatmapData(rows: HeatmapRow[]): HeatmapResponse {
    const heatmapData: Record<string, Record<string, { raw: number[] | number; normalized: number[] | number }>> = {};
    const activityOn: Record<string, number[] | number> = {};

    rows.forEach(({ number_of_mismatches: numberOfMismatches, variant, mean_background_subtracted_indel_frequency: frequency }) => {
      if (Number(numberOfMismatches) === 0) {
        if (!activityOn[variant]) {
          activityOn[variant] = [];
        }
        (activityOn[variant] as number[]).push(Number(frequency));
      }
    });

    Object.keys(activityOn).forEach((variant) => {
      const values = activityOn[variant] as number[];
      activityOn[variant] = values.reduce((sum, value) => sum + value, 0) / values.length;
    });

    rows.forEach(({ number_of_mismatches: numberOfMismatches, variant, mean_background_subtracted_indel_frequency: frequency, mismatch_positions: mismatchPositions }) => {
      if (Number(numberOfMismatches) === 0) {
        return;
      }

      const parsedPositions = this.parseMismatchPositions(mismatchPositions);
      if (parsedPositions.length === 0) {
        return;
      }

      if (!heatmapData[variant]) {
        heatmapData[variant] = {};
      }

      const x = String(parsedPositions[0] - 1);
      if (!heatmapData[variant][x]) {
        heatmapData[variant][x] = { raw: [], normalized: [] };
      }
      (heatmapData[variant][x].raw as number[]).push(Number(frequency));
    });

    Object.keys(heatmapData).forEach((variant) => {
      Object.keys(heatmapData[variant]).forEach((x) => {
        const rawValues = heatmapData[variant][x].raw as number[];
        const rawMean = rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;
        const onTargetActivity = Number(activityOn[variant]);

        heatmapData[variant][x].raw = rawMean;
        heatmapData[variant][x].normalized = rawMean / onTargetActivity;
      });
    });

    return heatmapData as HeatmapResponse;
  }

  private parseMismatchPositions(value: string): number[] {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }

  private convertIupacToRegex(pam: string): string {
    return pam
      .toUpperCase()
      .split("")
      .map((char) => iupacRegexMap[char] ?? char)
      .join("");
  }
}
