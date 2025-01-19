const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//pet_adoption
//HJyiZWWJLTJAd9u9


app.get('/', (req, res) => {
    res.send('server is runing');
})

app.listen(port, () => {
    console.log(`Server PORT: ${port}`);
})