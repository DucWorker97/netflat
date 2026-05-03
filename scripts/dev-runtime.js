#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, '.dev-runtime');
const LOG_DIR = path.join(RUNTIME_DIR, 'logs');
const PID_FILE = path.join(RUNTIME_DIR, 'pids.json');

const DEFAULT_TIMEOUTS = {
    infra: 90_000,
    api: 90_000,
    web: 90_000,
};

const MONITOR_INTERVAL_MS = 5_000;
const MAX_RESTART_ATTEMPTS = 3;
const GRACEFUL_STOP_TIMEOUT_MS = 5_000;

const MODES = {
    web: {
        profile: '.env.web.local',
        services: ['api', 'admin', 'web'],
    },
};

function now() {
    return new Date().toISOString();
}

function log(message) {
    process.stdout.write(`[dev-runtime ${now()}] ${message}\n`);
}

function logError(message) {
    process.stderr.write(`[dev-runtime ${now()}] ERROR: ${message}\n`);
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function getPnpmCmd() {
    return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function getPnpmRunner() {
    const execPath = process.env.npm_execpath;
    if (execPath && fs.existsSync(execPath)) {
        return {
            command: process.execPath,
            prefixArgs: [execPath],
        };
    }

    return {
        command: getPnpmCmd(),
        prefixArgs: [],
    };
}

function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function quoteWindowsCmdArg(value) {
    const stringValue = String(value);
    if (stringValue.length === 0) {
        return '""';
    }

    if (!/[\s"&()\[\]{}^=;!'+,`~|<>]/.test(stringValue)) {
        return stringValue;
    }

    return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildWindowsCmdInvocation(command, args) {
    return [command, ...args].map(quoteWindowsCmdArg).join(' ');
}

function parseArgs(argv) {
    const command = argv[2] || 'start';
    const options = {
        mode: 'dual',
        skipInfra: false,
        skipMigrate: false,
        skipGate: false,
        forcePorts: false,
        dryRun: false,
        noMonitor: false,
    };

    for (let i = 3; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--mode') {
            const value = argv[i + 1];
            if (!value) {
                throw new Error('--mode requires a value');
            }
            options.mode = value;
            i += 1;
            continue;
        }

        if (arg === '--skip-infra') {
            options.skipInfra = true;
            continue;
        }

        if (arg === '--skip-migrate') {
            options.skipMigrate = true;
            continue;
        }

        if (arg === '--skip-gate') {
            options.skipGate = true;
            continue;
        }

        if (arg === '--force-ports') {
            options.forcePorts = true;
            continue;
        }

        if (arg === '--dry-run') {
            options.dryRun = true;
            continue;
        }

        if (arg === '--no-monitor') {
            options.noMonitor = true;
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    if (!MODES[options.mode]) {
        throw new Error(`Invalid mode "${options.mode}". Use one of: ${Object.keys(MODES).join(', ')}`);
    }

    return { command, options };
}

function runSync(cmd, args, extra = {}) {
    const options = {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...extra,
    };

    const result = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd)
        ? spawnSync(
            process.env.ComSpec || 'cmd.exe',
            ['/d', '/s', '/c', buildWindowsCmdInvocation(cmd, args)],
            options,
        )
        : spawnSync(cmd, args, options);

    return {
        status: result.status ?? 1,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        error: result.error ? String(result.error.message || result.error) : '',
    };
}

function runSyncOrThrow(cmd, args, label, extra = {}) {
    const result = runSync(cmd, args, extra);
    if (result.status !== 0) {
        const details = [result.stdout.trim(), result.stderr.trim(), result.error.trim()]
            .filter(Boolean)
            .join('\n');
        throw new Error(`${label} failed${details ? `:\n${details}` : ''}`);
    }
    return result;
}

function writePidFile(payload) {
    ensureDir(RUNTIME_DIR);
    fs.writeFileSync(PID_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function readPidFile() {
    if (!fs.existsSync(PID_FILE)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
    } catch {
        return null;
    }
}

function isProcessAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function killPid(pid) {
    if (!isProcessAlive(pid)) {
        return true;
    }

    if (process.platform === 'win32') {
        // Try graceful termination first, then force-kill after timeout
        const graceful = runSync('taskkill', ['/PID', String(pid), '/T']);
        if (graceful.status === 0) {
            // Wait up to GRACEFUL_STOP_TIMEOUT_MS for process to exit
            const deadline = Date.now() + GRACEFUL_STOP_TIMEOUT_MS;
            while (Date.now() < deadline && isProcessAlive(pid)) {
                sleepSync(250);
            }
        }
        if (isProcessAlive(pid)) {
            const force = runSync('taskkill', ['/PID', String(pid), '/T', '/F']);
            return force.status === 0;
        }
        return true;
    }

    try {
        process.kill(pid, 'SIGTERM');
        // Wait briefly for graceful shutdown
        const deadline = Date.now() + GRACEFUL_STOP_TIMEOUT_MS;
        while (Date.now() < deadline && isProcessAlive(pid)) {
            spawnSync('sleep', ['0.5'], { stdio: 'ignore' });
        }
        if (isProcessAlive(pid)) {
            process.kill(pid, 'SIGKILL');
        }
        return true;
    } catch {
        return false;
    }
}

function copyEnvProfile(profile) {
    const source = path.join(ROOT, profile);
    const target = path.join(ROOT, '.env');
    if (!fs.existsSync(source)) {
        throw new Error(`Env profile not found: ${profile}`);
    }
    fs.copyFileSync(source, target);
    log(`Copied ${profile} -> .env`);
}

function parseEnvFile(filePath) {
    const env = {};
    if (!fs.existsSync(filePath)) {
        return env;
    }

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separator = trimmed.indexOf('=');
        if (separator <= 0) {
            continue;
        }

        const key = trimmed.slice(0, separator).trim();
        let value = trimmed.slice(separator + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }

    return env;
}

function parseUrlHost(url, key) {
    try {
        return new URL(url).host;
    } catch {
        throw new Error(`${key} must be a valid URL, got "${url}"`);
    }
}

function ensureModeConsistency(mode, env) {
    const apiPublic = env.API_PUBLIC_BASE_URL;
    const nextApi = env.NEXT_PUBLIC_API_BASE_URL;

    if (!apiPublic) {
        throw new Error('API_PUBLIC_BASE_URL is missing in .env');
    }

    if (mode === 'web') {
        if (!nextApi) {
            throw new Error('NEXT_PUBLIC_API_BASE_URL is required for web mode');
        }
        if (parseUrlHost(nextApi, 'NEXT_PUBLIC_API_BASE_URL') !== parseUrlHost(apiPublic, 'API_PUBLIC_BASE_URL')) {
            throw new Error('Web mode host mismatch between NEXT_PUBLIC_API_BASE_URL and API_PUBLIC_BASE_URL');
        }
        return;
    }
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs, label, predicate) {
    const deadline = Date.now() + timeoutMs;
    let lastError = '';
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            const body = await response.text();
            const ok = predicate ? predicate(response, body) : response.ok;
            if (ok) {
                return;
            }
            lastError = `status=${response.status}`;
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }
        await wait(1500);
    }

    throw new Error(`${label} not ready within ${Math.ceil(timeoutMs / 1000)}s (${lastError || 'no response'})`);
}

async function waitForLog(filePath, pattern, timeoutMs, label) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (pattern.test(content)) {
                return;
            }
        }
        await wait(1500);
    }

    throw new Error(`${label} did not reach ready state within ${Math.ceil(timeoutMs / 1000)}s`);
}

async function isTcpPortOpen(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const onDone = (result) => {
            socket.destroy();
            resolve(result);
        };

        socket.setTimeout(1000);
        socket.once('connect', () => onDone(true));
        socket.once('timeout', () => onDone(false));
        socket.once('error', () => onDone(false));
        socket.connect(port, host);
    });
}

async function waitForTcpPort(port, timeoutMs, label) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const open = await isTcpPortOpen(port);
        if (open) {
            return;
        }
        await wait(1000);
    }
    throw new Error(`${label} TCP port ${port} is not reachable within ${Math.ceil(timeoutMs / 1000)}s`);
}

async function assertPortsFree(ports) {
    const busy = await findBusyPorts(ports);
    if (busy.length > 0) {
        throw new Error(
            `Ports already in use: ${busy.join(', ')}. Run "pnpm dev:runtime:stop" or close conflicting processes.`,
        );
    }
}

async function findBusyPorts(ports) {
    const busy = [];
    for (const port of ports) {
        // eslint-disable-next-line no-await-in-loop
        const isOpen = await isTcpPortOpen(port);
        if (isOpen) {
            busy.push(port);
        }
    }
    return busy;
}

function forceFreePorts(ports) {
    if (ports.length === 0) {
        return;
    }
    log(`Freeing ports: ${ports.join(', ')}`);
    const runner = getPnpmRunner();
    runSyncOrThrow(
        runner.command,
        [...runner.prefixArgs, 'dlx', 'kill-port', ...ports.map((port) => String(port))],
        'kill-port',
    );
}

function toPowerShellLiteral(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
}

function startProcessWindows(command, args, outPath, errPath) {
    const argList = args.map((arg) => toPowerShellLiteral(arg)).join(', ');
    const psScript = [
        `$argsList = @(${argList});`,
        `$p = Start-Process -FilePath ${toPowerShellLiteral(command)} -ArgumentList $argsList -WorkingDirectory ${toPowerShellLiteral(ROOT)} -RedirectStandardOutput ${toPowerShellLiteral(outPath)} -RedirectStandardError ${toPowerShellLiteral(errPath)} -WindowStyle Hidden -PassThru;`,
        'Write-Output $p.Id',
    ].join(' ');

    const result = runSyncOrThrow('powershell.exe', ['-NoProfile', '-Command', psScript], 'Start-Process');
    const raw = result.stdout.trim().split(/\r?\n/).pop() || '';
    const pid = Number.parseInt(raw, 10);
    if (!Number.isInteger(pid) || pid <= 0) {
        throw new Error(`Could not parse process PID from Start-Process output: "${result.stdout.trim()}"`);
    }
    return pid;
}

function startProcess(name, args) {
    ensureDir(LOG_DIR);
    const outPath = path.join(LOG_DIR, `${name}.out.log`);
    const errPath = path.join(LOG_DIR, `${name}.err.log`);
    const runner = getPnpmRunner();
    const commandArgs = [...runner.prefixArgs, ...args];
    let pid = 0;

    if (process.platform === 'win32') {
        pid = startProcessWindows(runner.command, commandArgs, outPath, errPath);
    } else {
        const outFd = fs.openSync(outPath, 'a');
        const errFd = fs.openSync(errPath, 'a');
        const child = spawn(runner.command, commandArgs, {
            cwd: ROOT,
            detached: true,
            stdio: ['ignore', outFd, errFd],
        });
        child.unref();
        fs.closeSync(outFd);
        fs.closeSync(errFd);
        if (child.pid) {
            pid = child.pid;
        }
    }

    if (!pid) {
        throw new Error(`Failed to start ${name}`);
    }

    log(`Started ${name} (pid=${pid})`);
    return pid;
}

function ensureTooling() {
    runSyncOrThrow(process.execPath, ['--version'], 'Node.js check');
    const runner = getPnpmRunner();
    runSyncOrThrow(runner.command, [...runner.prefixArgs, '--version'], 'pnpm check');
    runSyncOrThrow('docker', ['--version'], 'Docker check');
}

async function ensureInfra(skipInfra) {
    if (skipInfra) {
        log('Skipping infrastructure startup (--skip-infra)');
        return;
    }

    log('Starting infrastructure (postgres, redis, minio, minio-init) ...');
    runSyncOrThrow('docker', ['compose', 'up', '-d', 'postgres', 'redis', 'minio', 'minio-init'], 'docker compose up');
    await waitForTcpPort(5433, DEFAULT_TIMEOUTS.infra, 'Postgres');
    await waitForTcpPort(6380, DEFAULT_TIMEOUTS.infra, 'Redis');
    await waitForTcpPort(9002, DEFAULT_TIMEOUTS.infra, 'MinIO');
    log('Infrastructure is reachable on ports 5433/6380/9002');
}

function runMigrations(skipMigrate) {
    if (skipMigrate) {
        log('Skipping migrations (--skip-migrate)');
        return;
    }

    log('Preparing local database schema and seed data ...');
    const runner = getPnpmRunner();
    runSyncOrThrow(runner.command, [...runner.prefixArgs, 'db:prepare:local'], 'db:prepare:local');
}

async function runDoctor(mode) {
    const modeConfig = MODES[mode];
    ensureTooling();
    copyEnvProfile(modeConfig.profile);
    const env = parseEnvFile(path.join(ROOT, '.env'));
    ensureModeConsistency(mode, env);
    await assertPortsFree([3000, 3001, 3002]);
    await ensureInfra(false);
    log('Doctor checks passed');
}

let monitorInterval = null;

function stopMonitor() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
}

function stopRuntime() {
    stopMonitor();

    const current = readPidFile();
    if (!current || !current.services) {
        log('No runtime state found');
        return;
    }

    const names = Object.keys(current.services);
    for (const name of names) {
        const pid = current.services[name];
        if (!pid) {
            continue;
        }
        const ok = killPid(pid);
        if (ok) {
            log(`Stopped ${name} (pid=${pid})`);
        } else {
            logError(`Could not stop ${name} (pid=${pid})`);
        }
    }

    try {
        fs.unlinkSync(PID_FILE);
    } catch {
        // ignore
    }
}

function setupGracefulShutdown() {
    const shutdown = () => {
        log('Received shutdown signal, cleaning up...');
        stopRuntime();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    if (process.platform === 'win32') {
        // Ctrl+C on Windows sends SIGINT but also needs readline trick
        const rl = require('readline').createInterface({ input: process.stdin });
        rl.on('SIGINT', shutdown);
    }
}

function statusRuntime() {
    const current = readPidFile();
    if (!current) {
        log('Runtime status: stopped');
        return;
    }

    log(`Runtime mode: ${current.mode}`);
    log(`Started at: ${current.startedAt}`);
    for (const [name, pid] of Object.entries(current.services || {})) {
        const status = isProcessAlive(pid) ? 'running' : 'stopped';
        log(`- ${name}: ${status} (pid=${pid})`);
    }
    log(`Logs: ${LOG_DIR}`);
}

async function waitServiceReady(name) {
    if (name === 'api') {
        await waitForHttp('http://localhost:3000/health', DEFAULT_TIMEOUTS.api, 'API');
        return;
    }

    if (name === 'admin') {
        await waitForHttp('http://localhost:3001', DEFAULT_TIMEOUTS.web, 'Admin');
        return;
    }

    if (name === 'web') {
        await waitForHttp('http://localhost:3002', DEFAULT_TIMEOUTS.web, 'Web');
        return;
    }
}

async function runCrossPlatformGate(mode) {
    const env = parseEnvFile(path.join(ROOT, '.env'));
    ensureModeConsistency(mode, env);
    await waitForHttp('http://localhost:3000/health', DEFAULT_TIMEOUTS.api, 'API health gate');
    await waitForHttp('http://localhost:3001', DEFAULT_TIMEOUTS.web, 'Admin gate');
    await waitForHttp('http://localhost:3002', DEFAULT_TIMEOUTS.web, 'Web gate');
}

const serviceRestartCounters = {};

const serviceArgs = {
    api: ['--filter', '@netflat/api', 'dev'],
    admin: ['--filter', '@netflat/admin', 'dev'],
    web: ['--filter', '@netflat/web', 'dev'],
};

function startProcessMonitor() {
    monitorInterval = setInterval(() => {
        const current = readPidFile();
        if (!current || !current.services) {
            stopMonitor();
            return;
        }

        for (const [name, pid] of Object.entries(current.services)) {
            if (!pid || isProcessAlive(pid)) {
                continue;
            }

            const restarts = serviceRestartCounters[name] || 0;
            if (restarts >= MAX_RESTART_ATTEMPTS) {
                logError(`${name} (pid=${pid}) died and exceeded max restart attempts (${MAX_RESTART_ATTEMPTS}). Giving up.`);
                continue;
            }

            logError(`${name} (pid=${pid}) died unexpectedly. Restarting (attempt ${restarts + 1}/${MAX_RESTART_ATTEMPTS})...`);
            try {
                const args = serviceArgs[name];
                if (!args) {
                    logError(`No command mapping for service "${name}", cannot restart.`);
                    continue;
                }
                const newPid = startProcess(name, args);
                current.services[name] = newPid;
                serviceRestartCounters[name] = restarts + 1;
                writePidFile(current);
                log(`Restarted ${name} (new pid=${newPid})`);
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                logError(`Failed to restart ${name}: ${msg}`);
            }
        }
    }, MONITOR_INTERVAL_MS);
}

async function startRuntime(options) {
    const modeConfig = MODES[options.mode];

    ensureTooling();
    ensureDir(RUNTIME_DIR);
    ensureDir(LOG_DIR);

    // Stop previous managed runtime before starting a new one.
    stopRuntime();

    // Set up Ctrl+C / SIGTERM handler to cleanup children
    setupGracefulShutdown();

    copyEnvProfile(modeConfig.profile);
    const env = parseEnvFile(path.join(ROOT, '.env'));
    ensureModeConsistency(options.mode, env);

    const runtimePorts = [3000, 3001, 3002];
    let busyPorts = await findBusyPorts(runtimePorts);
    if (busyPorts.length > 0 && options.forcePorts) {
        forceFreePorts(busyPorts);
        await wait(1500);
        busyPorts = await findBusyPorts(runtimePorts);
    }
    if (busyPorts.length > 0) {
        throw new Error(
            `Ports already in use: ${busyPorts.join(', ')}. Run "pnpm dev:runtime:stop" or start with --force-ports.`,
        );
    }

    await ensureInfra(options.skipInfra);
    runMigrations(options.skipMigrate);

    if (options.dryRun) {
        log('Dry run complete');
        return;
    }

    const pids = {};
    for (const serviceName of modeConfig.services) {
        const args = serviceArgs[serviceName];
        if (!args) {
            throw new Error(`No command mapping for service "${serviceName}"`);
        }

        pids[serviceName] = startProcess(serviceName, args);
        // eslint-disable-next-line no-await-in-loop
        await waitServiceReady(serviceName);
        log(`${serviceName} is ready`);
    }

    writePidFile({
        mode: options.mode,
        profile: modeConfig.profile,
        startedAt: now(),
        services: pids,
    });

    if (!options.skipGate) {
        await runCrossPlatformGate(options.mode);
        log('Cross-platform gate passed');
    } else {
        log('Skipped cross-platform gate (--skip-gate)');
    }

    // Start process health monitor (unless --no-monitor)
    if (!options.noMonitor) {
        startProcessMonitor();
        log('Process monitor active (checking every 5s, max 3 retries per service)');
    } else {
        log('Process monitor disabled (--no-monitor)');
    }

    log('Runtime started successfully');
    log('URLs:');
    log('  API:    http://localhost:3000/health');
    log('  Admin:  http://localhost:3001');
    log('  Web:    http://localhost:3002');
    log(`Logs: ${LOG_DIR}`);
}

async function main() {
    try {
        const { command, options } = parseArgs(process.argv);

        if (command === 'doctor') {
            await runDoctor(options.mode);
            return;
        }

        if (command === 'start') {
            await startRuntime(options);
            return;
        }

        if (command === 'stop') {
            stopRuntime();
            return;
        }

        if (command === 'status') {
            statusRuntime();
            return;
        }

        throw new Error(`Unknown command "${command}". Use: doctor | start | stop | status`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError(message);
        process.exit(1);
    }
}

main();
