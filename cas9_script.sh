sudo apt update
sudo apt install nodejs
sudo apt install npm
sudo npm install -g n
sudo npx n stable


sudo apt install mysql-server-y
sudo systemctl enable -now mysql
sudo mysql_secure_installation
systemctl status mysql
sudo mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '1018';
FLUSH PRIVILEGES;

# create database called 'cas9' and connect to it
CREATE DATABASE cas9;
USE cas9;

# create cas9 table and import data
CREATE TABLE `cas9` (
  `id` int NOT NULL,
  `spacer_sequence_raw` text,
  `target_context_sequence_raw` text,
  `spacer_sequence` text,
  `target_context_sequence` text,
  `variant` varchar(255),
  `nuclease` varchar(255),
  `gRNA_scaffold` varchar(255),
  `day` varchar(255),
  `tRNA_feature` enum('TRUE','FALSE'),
  `study` text,
  `library` text,
  `table_number` text,
  `sheet_number` text,
  `src_idx` text,
  `n_data` int,
  `partition` varchar(255),
  `barcode` text,
  `background_subtracted_indel_frequencies` text,
  `mean_background_subtracted_indel_frequency_source` text,
  `mean_background_subtracted_indel_frequency` double,
  `number_of_mismatches` int,
  `best_matching_substring` text,
  `best_matching_index` int,
  `mismatch_positions` text,
  PRIMARY KEY (`id`)
);

sudo cp /home/yym/Cas9_with_mismatches_and_substring_and_indexes_fixed.csv /var/lib/mysql-files/

LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/Cas9_new1.csv'
INTO TABLE cas9
FIELDS TERMINATED BY ','   
ENCLOSED BY '"'            
LINES TERMINATED BY '\n'   
IGNORE 1 LINES;

ALTER TABLE cas9
ADD COLUMN mismatch_position INT;

UPDATE cas9
SET mismatch_position = FLOOR(CAST(mismatch_indexes AS DECIMAL)) 
    - LOCATE(best_matching_substring, target_context_sequence_raw) + 2
WHERE number_of_mismatches = 1;

# create gRNA_scaffold table and import data
CREATE TABLE `grna_scaffold` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gRNA_scaffold` varchar(25) DEFAULT NULL,
  `gRNA_scaffold_sequence` text,
  `polyT_length` int DEFAULT NULL,
  `gRNA_scaffold_sequence_length` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

sudo cp /home/yym/gRNA_scaffolds.csv /var/lib/mysql-files/

LOAD DATA INFILE '/var/lib/mysql-files/gRNA_scaffolds.csv'
INTO TABLE grna_scaffold
FIELDS TERMINATED BY ','   
ENCLOSED BY '"'            
LINES TERMINATED BY '\n'   
IGNORE 1 LINES            
(gRNA_scaffold, gRNA_scaffold_sequence, polyT_length, gRNA_scaffold_sequence_length);

