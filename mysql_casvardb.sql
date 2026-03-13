# create database called 'casvardb' and connect to it
CREATE DATABASE casvardb;
USE casvardb;

# create tables for storing Cas9, Cas12, gRNA scaffolds data
CREATE TABLE `cas9` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cas12` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `grna_scaffold` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gRNA_scaffold` varchar(25) DEFAULT NULL,
  `gRNA_scaffold_sequence` text,
  `polyT_length` int DEFAULT NULL,
  `gRNA_scaffold_sequence_length` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
