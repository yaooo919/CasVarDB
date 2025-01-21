const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;


app.use(cors());
app.use(express.json());

const gRNARoutes = require('./routes/gRNA_scaffold');
app.use('/grna', gRNARoutes);

const dataRoutes = require('./routes/data');
app.use('/data', dataRoutes);

const downloadRoutes = require('./routes/download');
app.use('/download', downloadRoutes);

const statisticsRoutes = require('./routes/statistics');
app.use('/statistics', statisticsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
