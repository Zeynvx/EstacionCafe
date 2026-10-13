require('dotenv').config();
const app = require('./src/app');

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API Estación Café escuchando en http://localhost:${port}/api/v1`));
