#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const readline = require('readline');
const net = require('net');

const PORT = process.env.PORT || 3000;
const SERVER_FILE = 'src/server.js';

// ANSI color codes for better output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false); // Port is free
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
}

function findProcessOnPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }
      
      const pids = stdout.trim().split('\n').filter(Boolean);
      if (pids.length === 0) {
        resolve(null);
        return;
      }
      
      // Get process details for the first PID
      exec(`ps -p ${pids[0]} -o pid,comm,args --no-headers`, (error, stdout) => {
        if (error) {
          resolve({ pids });
          return;
        }
        
        const processInfo = stdout.trim();
        resolve({ pids, info: processInfo });
      });
    });
  });
}

function killProcesses(pids) {
  return new Promise((resolve) => {
    exec(`kill ${pids.join(' ')}`, (error) => {
      if (error) {
        log(`Failed to kill processes: ${error.message}`, 'red');
        resolve(false);
        return;
      }
      
      // Wait a moment for processes to terminate
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  });
}

function askUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

function startServer() {
  log(`\n🚀 Starting Notion HomeTree development server...`, 'green');
  log(`📍 Server will run on: http://localhost:${PORT}`, 'cyan');
  log(`📝 Config page: http://localhost:${PORT}/config`, 'cyan');
  log(`📚 Documentation: http://localhost:${PORT}/docs\n`, 'cyan');
  
  const nodemon = spawn('npx', ['nodemon', SERVER_FILE], {
    stdio: 'inherit',
    env: { ...process.env, PORT }
  });
  
  nodemon.on('close', (code) => {
    if (code !== 0) {
      log(`\n❌ Server exited with code ${code}`, 'red');
    } else {
      log(`\n✅ Server stopped gracefully`, 'green');
    }
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    log(`\n🛑 Shutting down development server...`, 'yellow');
    nodemon.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    nodemon.kill('SIGTERM');
  });
}

async function main() {
  log(`${colors.bold}${colors.magenta}🌳 Notion HomeTree Development Server${colors.reset}\n`);
  
  // Check if port is in use
  const portInUse = await checkPortInUse(PORT);
  
  if (!portInUse) {
    // Port is free, start the server
    startServer();
    return;
  }
  
  // Port is in use, find what's using it
  log(`⚠️  Port ${PORT} is already in use`, 'yellow');
  
  const processInfo = await findProcessOnPort(PORT);
  
  if (processInfo) {
    log(`\n📋 Process using port ${PORT}:`, 'blue');
    if (processInfo.info) {
      log(`   ${processInfo.info}`, 'cyan');
    } else {
      log(`   PID(s): ${processInfo.pids.join(', ')}`, 'cyan');
    }
    
    // Check if it's likely our own server
    const isOurServer = processInfo.info && (
      processInfo.info.includes('server.js') || 
      processInfo.info.includes('nodemon') ||
      processInfo.info.includes('notion-hometree')
    );
    
    if (isOurServer) {
      log(`\n🔍 This appears to be a Notion HomeTree server process`, 'yellow');
    }
    
    log(`\nWhat would you like to do?`, 'bold');
    log(`  ${colors.green}k${colors.reset} - Kill the existing process and start the server`);
    log(`  ${colors.blue}s${colors.reset} - Start on a different port (3001)`);
    log(`  ${colors.red}q${colors.reset} - Quit without starting`);
    
    const answer = await askUser('\nYour choice (k/s/q): ');
    
    switch (answer) {
      case 'k':
      case 'kill':
        log(`\n🔄 Killing existing process(es)...`, 'yellow');
        const killed = await killProcesses(processInfo.pids);
        
        if (killed) {
          log(`✅ Process killed successfully`, 'green');
          
          // Double-check port is now free
          const stillInUse = await checkPortInUse(PORT);
          if (stillInUse) {
            log(`❌ Port ${PORT} is still in use. Please manually kill the process.`, 'red');
            process.exit(1);
          }
          
          startServer();
        } else {
          log(`❌ Failed to kill process. Please manually kill PID(s): ${processInfo.pids.join(', ')}`, 'red');
          process.exit(1);
        }
        break;
        
      case 's':
      case 'start':
        log(`\n🔄 Starting server on port 3001...`, 'yellow');
        process.env.PORT = '3001';
        startServer();
        break;
        
      case 'q':
      case 'quit':
      case 'exit':
        log(`\nNow exiting...`, 'yellow');
        process.exit(0);
        break;
        
      default:
        log(`\n❌ Invalid choice. Please run the command again.`, 'red');
        process.exit(1);
    }
  } else {
    // Port in use but can't find process info
    log(`\n❌ Unable to identify the process using port ${PORT}`, 'red');
    log(`Please manually free the port or use a different port with: PORT=3001 npm run dev`, 'yellow');
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
}); 