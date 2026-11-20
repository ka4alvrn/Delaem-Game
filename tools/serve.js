const { createServer } = require('./server');
const path = require('path');
const port = +process.env.PORT || 8080;
createServer(path.join(__dirname, '..')).listen(port, '0.0.0.0', () => {
  console.log('Сервер запущен: http://0.0.0.0:' + port);
});
