import os
import pandas as pd
import pymysql
import gdown


def sql_value(v):
    return None if pd.isna(v) else v


def normalize_trna_feature(v):
    if pd.isna(v):
        return None

    s = str(v).strip().upper()

    if s in {"TRUE", "T", "1", "YES", "Y"}:
        return "TRUE"
    if s in {"FALSE", "F", "0", "NO", "N"}:
        return "FALSE"

    return None


def ensure_not_html(filepath: str):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        head = f.read(1000).lower()
    if "<!doctype html" in head or "<html" in head:
        raise ValueError(f"{filepath} is HTML, not CSV")


def download_from_gdrive(url: str, output_path: str):
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        ensure_not_html(output_path)
        print(f"Skip existing file: {output_path}")
        return

    gdown.download(url=url, output=output_path, fuzzy=True, quiet=False)
    ensure_not_html(output_path)
    print(f"Downloaded: {output_path}")


# Google Drive share links
cas9_url = "https://drive.google.com/file/d/1cp_gGih_2AV6HyYdINjH0fveo-0xbaVz/view?usp=sharing"
cas12_url = "https://drive.google.com/file/d/1U6w07YwiZIIShxbZvWkoXw3J_pIrDocj/view?usp=sharing"
grna_url = "https://drive.google.com/file/d/1sDnQQZzjtbWC_LhaqimjMkOQ6WxyoLZz/view?usp=sharing"

# Local filenames
cas9_file = "Cas9.csv"
cas12_file = "Cas12.csv"
grna_file = "gRNA_scaffolds.csv"

# Download files
download_from_gdrive(cas9_url, cas9_file)
download_from_gdrive(cas12_url, cas12_file)
download_from_gdrive(grna_url, grna_file)

# Read CSV
cas9 = pd.read_csv(cas9_file, low_memory=False)
cas12 = pd.read_csv(cas12_file, low_memory=False)
gRNA_scaffolds = pd.read_csv(grna_file, low_memory=False)

print("tRNA feature sample values:")
print(cas9["tRNA feature"].dropna().astype(str).str.strip().value_counts().head(20))

# Connect to MySQL server
conn = pymysql.connect(
    host="127.0.0.1",
    port=13306,
    user="collab_casvardb",
    password="Cv2y*%",
    charset="utf8mb4",
    connect_timeout=30,
    autocommit=False,
)

cursor = conn.cursor()

# Create database and switch to it
cursor.execute("CREATE DATABASE IF NOT EXISTS casvardb")
conn.select_db("casvardb")

# Create tables
create_cas9_sql = """
CREATE TABLE IF NOT EXISTS `cas9` (
  `id` int NOT NULL,
  `spacer_sequence_raw` text,
  `target_context_sequence_raw` text,
  `spacer_sequence` text,
  `target_context_sequence` text,
  `variant` varchar(255) DEFAULT NULL,
  `nuclease` varchar(255) DEFAULT NULL,
  `gRNA_scaffold` varchar(255) DEFAULT NULL,
  `day` varchar(255) DEFAULT NULL,
  `tRNA_feature` enum('TRUE','FALSE') DEFAULT NULL,
  `study` text,
  `library` text,
  `table_number` text,
  `sheet_number` text,
  `src_idx` text,
  `n_data` int DEFAULT NULL,
  `partition` varchar(255) DEFAULT NULL,
  `barcode` text,
  `background_subtracted_indel_frequencies` text,
  `mean_background_subtracted_indel_frequency_source` text,
  `mean_background_subtracted_indel_frequency` double DEFAULT NULL,
  `spacer_index` int DEFAULT NULL,
  `number_of_mismatches` int DEFAULT NULL,
  `mismatch_positions` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
"""

create_cas12_sql = """
CREATE TABLE IF NOT EXISTS `cas12` (
  `id` int NOT NULL,
  `spacer_sequence_raw` text,
  `target_context_sequence_raw` text,
  `spacer_sequence` text,
  `target_context_sequence` text,
  `variant` varchar(255) DEFAULT NULL,
  `nuclease` varchar(255) DEFAULT NULL,
  `gRNA_scaffold` varchar(255) DEFAULT NULL,
  `day` varchar(255) DEFAULT NULL,
  `cas12a_transfection` varchar(255) DEFAULT NULL,
  `study` text,
  `library` text,
  `table_number` text,
  `sheet_number` text,
  `src_idx` text,
  `n_data` int DEFAULT NULL,
  `partition` varchar(255) DEFAULT NULL,
  `barcode` text,
  `background_subtracted_indel_frequencies` text,
  `mean_background_subtracted_indel_frequency_source` text,
  `mean_background_subtracted_indel_frequency` double DEFAULT NULL,
  `number_of_mismatches` int DEFAULT NULL,
  `mismatch_positions` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
"""

create_grna_sql = """
CREATE TABLE IF NOT EXISTS `grna_scaffold` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gRNA_scaffold` varchar(25) DEFAULT NULL,
  `gRNA_scaffold_sequence` text,
  `polyT_length` int DEFAULT NULL,
  `gRNA_scaffold_sequence_length` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
"""

cursor.execute(create_cas9_sql)
cursor.execute(create_cas12_sql)
cursor.execute(create_grna_sql)
conn.commit()

print("Database and tables created successfully!")

# Insert Cas9
cas9_sql = """
    INSERT IGNORE INTO cas9 (
        `id`,
        `spacer_sequence_raw`,
        `target_context_sequence_raw`,
        `spacer_sequence`,
        `target_context_sequence`,
        `variant`,
        `nuclease`,
        `gRNA_scaffold`,
        `day`,
        `tRNA_feature`,
        `study`,
        `library`,
        `table_number`,
        `sheet_number`,
        `src_idx`,
        `n_data`,
        `partition`,
        `barcode`,
        `background_subtracted_indel_frequencies`,
        `mean_background_subtracted_indel_frequency_source`,
        `mean_background_subtracted_indel_frequency`,
        `spacer_index`,
        `number_of_mismatches`,
        `mismatch_positions`
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

for idx, row in cas9.iterrows():
    try:
        values = (
            sql_value(row["ID"]),
            sql_value(row["Spacer sequence (raw)"]),
            sql_value(row["Target context sequence (raw)"]),
            sql_value(row["Spacer sequence"]),
            sql_value(row["Target context sequence"]),
            sql_value(row["Variant"]),
            sql_value(row["Nuclease"]),
            sql_value(row["gRNA scaffold"]),
            sql_value(row["Day"]),
            normalize_trna_feature(row["tRNA feature"]),
            sql_value(row["Study"]),
            sql_value(row["Library"]),
            sql_value(row["Table"]),
            sql_value(row["Sheet"]),
            sql_value(row["src_idx"]),
            sql_value(row["n_data"]),
            sql_value(row["Partition"]),
            sql_value(row["Barcode"]),
            sql_value(row["Background subtracted indel frequencies (%)"]),
            sql_value(row["Mean background subtracted indel frequency (source, %)"]),
            sql_value(row["Mean background subtracted indel frequency (%)"]),
            sql_value(row["Spacer index"]),
            sql_value(row["Number of mismatches"]),
            sql_value(row["Mismatch positions"]),
        )
        cursor.execute(cas9_sql, values)
        if (idx + 1) % 1000 == 0:
            conn.commit()
            print(f"Cas9 inserted: {idx + 1} rows processed")
    except Exception as e:
        print(f"Cas9 insert failed at row index {idx}: {e}")
        print(row.to_dict())
        raise

conn.commit()
print("Cas9 data inserted successfully!")

# Insert Cas12
cas12_sql = """
    INSERT IGNORE INTO cas12 (
        `id`,
        `spacer_sequence_raw`,
        `target_context_sequence_raw`,
        `spacer_sequence`,
        `target_context_sequence`,
        `variant`,
        `nuclease`,
        `gRNA_scaffold`,
        `day`,
        `cas12a_transfection`,
        `study`,
        `library`,
        `table_number`,
        `sheet_number`,
        `src_idx`,
        `n_data`,
        `partition`,
        `barcode`,
        `background_subtracted_indel_frequencies`,
        `mean_background_subtracted_indel_frequency_source`,
        `mean_background_subtracted_indel_frequency`,
        `number_of_mismatches`,
        `mismatch_positions`
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

for idx, row in cas12.iterrows():
    try:
        values = (
            sql_value(row["ID"]),
            sql_value(row["Spacer sequence (raw)"]),
            sql_value(row["Target context sequence (raw)"]),
            sql_value(row["Spacer sequence"]),
            sql_value(row["Target context sequence"]),
            sql_value(row["Variant"]),
            sql_value(row["Nuclease"]),
            sql_value(row["gRNA scaffold"]),
            sql_value(row["Day"]),
            sql_value(row["Cas12a transfection"]),
            sql_value(row["Study"]),
            sql_value(row["Library"]),
            sql_value(row["Table"]),
            sql_value(row["Sheet"]),
            sql_value(row["src_idx"]),
            sql_value(row["n_data"]),
            sql_value(row["Partition"]),
            sql_value(row["Barcode"]),
            sql_value(row["Background subtracted indel frequencies (%)"]),
            sql_value(row["Mean background subtracted indel frequency (source, %)"]),
            sql_value(row["Mean background subtracted indel frequency (%)"]),
            sql_value(row["Number of mismatches"]),
            sql_value(row["Mismatch positions"]),
        )
        cursor.execute(cas12_sql, values)
        if (idx + 1) % 1000 == 0:
            conn.commit()
            print(f"Cas12 inserted: {idx + 1} rows processed")
    except Exception as e:
        print(f"Cas12 insert failed at row index {idx}: {e}")
        print(row.to_dict())
        raise

conn.commit()
print("Cas12 data inserted successfully!")

# Insert gRNA scaffolds
grna_sql = """
    INSERT IGNORE INTO grna_scaffold (
        gRNA_scaffold,
        gRNA_scaffold_sequence,
        polyT_length,
        gRNA_scaffold_sequence_length
    ) VALUES (%s, %s, %s, %s)
"""

for idx, row in gRNA_scaffolds.iterrows():
    try:
        values = (
            sql_value(row["gRNA scaffold"]),
            sql_value(row["gRNA scaffold sequence"]),
            sql_value(row["polyT length"]),
            sql_value(row["gRNA scaffold sequence length"]),
        )
        cursor.execute(grna_sql, values)
    except Exception as e:
        print(f"gRNA scaffold insert failed at row index {idx}: {e}")
        print(row.to_dict())
        raise

conn.commit()
print("gRNA scaffolds data inserted successfully!")

cursor.close()
conn.close()
print("All done!")