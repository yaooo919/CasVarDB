const express = require('express');
const cors = require('cors');
const app = express();
// const port = 8888;
const port = 5000;


app.use(cors());
app.use(express.json());

const gRNARoutes = require('./routes/gRNA_scaffold');
app.use('/grna', gRNARoutes);

const cas9DataRoutes = require('./routes/data_cas9');
app.use('/data/cas9', cas9DataRoutes);

const cas12DataRoutes = require('./routes/data_cas12');
app.use('/data/cas12', cas12DataRoutes);

const downloadRoutes = require('./routes/download');
app.use('/download', downloadRoutes);

const statisticsRoutes = require('./routes/statistics');
app.use('/statistics', statisticsRoutes);

const submitRoutes = require('./routes/submit');
app.use('/submit', submitRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
