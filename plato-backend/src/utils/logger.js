export function requestLogger(req, res, next) {
     const start = Date.now();
     const { method, url } = req;
   
     res.on('finish', () => {
       const duration = Date.now() - start;
       const { statusCode } = res;
   
       const statusEmoji = statusCode < 400 ? '✓' : '❌';
       console.log(`${statusEmoji} ${method} ${url} - ${statusCode} (${duration}ms)`);
     });
   
     next();
   }
   

   export function log(message, level = 'info') {
     const timestamp = new Date().toISOString();
     const prefix = {
       info: '✓',
       error: '❌',
       warn: '⚠️',
       debug: '🐛',
     }[level] || '•';
   
     console.log(`${prefix} [${timestamp}] ${message}`);
   }
   
   export default { requestLogger, log };