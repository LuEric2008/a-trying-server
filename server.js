const http = require('http');
const WebSocket = require('ws');

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 设置 UTF-8 编码的响应头
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8'
  };
  
  // 处理根路径请求
  if (req.url === '/') {
    res.writeHead(200, headers);
    return res.end('DABU的WebSocket服务器运行中 🚀\n访问https://dabuserver.glitch.me/health查看状态\n版权Eric Lu,2025\n');
  }
  
  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, headers);
    return res.end('服务器状态: 运行正常✅\n版权Eric Lu,2025\n');
  }
  
  // 处理图标请求
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }
  
  // 处理其他请求
  res.writeHead(404, headers);
  res.end('404 - 页面未找到\n版权Eric Lu,2025\n');
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ noServer: true });

// 处理 HTTP 升级请求 (WebSocket 连接)
server.on('upgrade', (request, socket, head) => {
  // 只允许特定路径的 WebSocket 连接
  if (request.url === '/websocket') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy(); // 关闭无效的升级请求
  }
});

// 客户端管理
const clients = new Map();
let connectionCounter = 0;

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
  const id = ++connectionCounter;
  const ip = req.socket.remoteAddress.replace('::ffff:', '');
  const timestamp = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false
  });
  
  // 存储客户端信息
  clients.set(ws, { id, ip, timestamp });
  
  console.log(`\n[${timestamp}] 新客户端连接 #${id}`);
  console.log(`IP 地址: ${ip}`);
  console.log(`当前连接数: ${clients.size}`);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'system',
    id,
    message: '已成功连接到 WebSocket 服务器',
    timestamp: Date.now()
  }));
  
  // 处理消息
  ws.on('message', (data) => {
    const message = data.toString('utf8');
    const clientInfo = clients.get(ws);
    const timestamp = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false
    });
    
    console.log(`\n[${timestamp}] 收到消息 #${clientInfo.id}`);
    console.log(`内容: ${message}`);
    
    // 广播消息给所有客户端（除了发送者）
    clients.forEach((info, client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'broadcast',
          from: clientInfo.id,
          message,
          timestamp: Date.now()
        }));
      }
    });
    
    console.log(`已广播给 ${clients.size - 1} 个客户端`);
  });
  
  // 错误处理
  ws.on('error', (error) => {
    console.error(`客户端 #${id} 错误:`, error.message);
  });
  
  // 关闭连接
  ws.on('close', () => {
    clients.delete(ws);
    const timestamp = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false
    });
    
    console.log(`\n[${timestamp}] 客户端断开 #${id}`);
    console.log(`剩余连接数: ${clients.size}`);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const timestamp = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false
  });
  
  console.log(`\n[${timestamp}] ====== 服务器已启动 ======`);
  console.log(`HTTP 端口: ${PORT}`);
  console.log(`WebSocket 端点: wss://${process.env.PROJECT_DOMAIN}.glitch.me/websocket`);
  console.log(`健康检查: https://${process.env.PROJECT_DOMAIN}.glitch.me/health`);
  console.log('等待客户端连接...');
});

// 心跳检测
setInterval(() => {
  clients.forEach((info, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err);
});

// 处理进程退出信号
process.on('SIGTERM', () => {
  console.log('收到终止信号，关闭服务器...');
  wss.close();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});