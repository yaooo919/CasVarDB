const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const port = 5000;
const targetServer = 'http://10.8.0.2:5000';

const upload = multer(); 

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

const submitRoutes = require('./routes/submit');
app.use('/submit', submitRoutes);

app.post('/forward', upload.any(), async (req, res) => {
  try {
      const { endpoint, method = "POST", params = {} } = req.body;

      let response;
      if (method === "GET") {
          response = await axios.get(`${targetServer}${endpoint}`, { params });
      } else {
          if (req.is('multipart/form-data')) {
              const formData = new FormData();
              
              req.files.forEach(file => {
                  formData.append(file.fieldname, file.buffer, file.originalname);
              });

              Object.keys(req.body).forEach(key => {
                  formData.append(key, req.body[key]);
              });

              response = await axios.post(`${targetServer}${endpoint}`, formData, {
                  headers: { ...formData.getHeaders() },
              });
          } else {
              response = await axios.post(`${targetServer}${endpoint}`, req.body, {
                  headers: { 'Content-Type': 'application/json' },
              });
          }
      }
      console.log(`Forwarding ${method} request to: ${targetServer}${endpoint}`);
      res.json(response.data);
  } catch (error) {
      console.error('Error forwarding request:', error);
      res.status(500).json({ error: 'Failed to forward request' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
