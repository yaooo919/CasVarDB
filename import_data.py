import pandas as pd
import pymysql

conn = pymysql.connect(
    host='localhost',        
    user='collab_casvardb',       
    password='Cv2y*%',   
    database='casvardb',   
    charset='utf8mb4'
)

cursor = conn.cursor()

cas9 = pd.read_csv('Cas9.csv')
cas12 = pd.read_csv("Cas12.csv", low_memory=False)
gRNA_scaffolds = pd.read_csv('gRNA_scaffolds.csv')

for _, row in cas9.iterrows():
    sql = """
        INSERT INTO cas9 (
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
    
    values = (
        row['ID'],
        row['Spacer sequence (raw)'],
        row['Target context sequence (raw)'],
        row['Spacer sequence'],
        row['Target context sequence'],
        row['Variant'],
        row['Nuclease'],
        row['gRNA scaffold'],
        row['Day'],
        row['tRNA feature'],
        row['Study'],
        row['Library'],
        row['Table'],
        row['Sheet'],
        row['src_idx'],
        row['n_data'],
        row['Partition'],
        row['Barcode'],
        row['Background subtracted indel frequencies (%)'],
        row['Mean background subtracted indel frequency (source, %)'],
        row['Mean background subtracted indel frequency (%)'],
        row['Spacer index'],
        row['Number of mismatches'],
        row['Mismatch positions']
    )
    
    cursor.execute(sql, values)

conn.commit()

print("Cas9 data inserted successfully!")

for _, row in cas12.iterrows():
    sql = """
        INSERT INTO cas12 (
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
    
    values = (
        row['ID'],
        row['Spacer sequence (raw)'],
        row['Target context sequence (raw)'],
        row['Spacer sequence'],
        row['Target context sequence'],
        row['Variant'],
        row['Nuclease'],
        row['gRNA scaffold'],
        row['Day'],
        row['Cas12a transfection'],
        row['Study'],
        row['Library'],
        row['Table'],
        row['Sheet'],
        row['src_idx'],
        row['n_data'],
        row['Partition'],
        row['Barcode'],
        row['Background subtracted indel frequencies (%)'],
        row['Mean background subtracted indel frequency (source, %)'],
        row['Mean background subtracted indel frequency (%)'],
        row['Number of mismatches'],
        row['Mismatch positions']
    )
    
    cursor.execute(sql, values)

conn.commit()

print("Cas12 data inserted successfully!")


for _, row in gRNA_scaffolds.iterrows():
    sql = """
        INSERT INTO grna_scaffold (
            gRNA_scaffold,
            gRNA_scaffold_sequence,
            polyT_length,
            gRNA_scaffold_sequence_length
        ) VALUES (%s, %s, %s, %s)
    """
    
    values = (
        row['gRNA scaffold'],
        row['gRNA scaffold sequence'],
        row['polyT length'],
        row['gRNA scaffold sequence length'],
    )
    
    cursor.execute(sql, values)

conn.commit()

print("gRNA scaffolds data inserted successfully!")

# close connection
cursor.close()
conn.close()


