const { execSync } = require('child_process');

try {
  execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3000\') do taskkill /F /PID %a', { 
    stdio: 'ignore',
    shell: true 
  });
  console.log('Killed existing processes');
} catch (e) {}

try {
  console.log('Starting Next.js server...');
  execSync('next start', { 
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
} catch (e) {
  console.error('Failed:', e.message);
}