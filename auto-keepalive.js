const http = require('http');
setInterval(() => {
  http.get('http://your-project.glitch.me');
}, 55000); // 55秒触发一次