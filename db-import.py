import pandas as pd
import pymysql

df = pd.read_csv("Cas9_new1.csv")

conn = pymysql.connect(
    host='localhost',        
    user='root',       
    password='1018',   
    database='cas9',   
    charset='utf8mb4'
)

cursor = conn.cursor()

df = pd.read_csv('Cas9_new1.csv')

# Below code is not needed if using Cas9_new2.csv
# Change NaN to None（MySQL accepts None as NULL）
df = df.where(pd.notnull(df), None)

df['tRNA feature'] = df['tRNA feature'].apply(lambda x: 'True' if x is True else ('False' if x is False else None))

for _, row in df.iterrows():
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
            `number_of_mismatches`,
            `best_matching_substring`,
            `best_matching_index`,
            `mismatch_positions`
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    # Make sure that the values are in the correct order
    values = (
        row['id'],
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
        row['Number of mismatches'],
        row['Best matching substring'],
        row['Best matching index'],
        row['Mismatch positions']
    )
    
    cursor.execute(sql, values)

conn.commit()

# close connection
cursor.close()
conn.close()

print("Data inserted successfully!")