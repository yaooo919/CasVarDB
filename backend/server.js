const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;


app.use(cors());
app.use(express.json());


const cas9Routes = require('./routes/cas9');
app.use('/cas9', cas9Routes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
