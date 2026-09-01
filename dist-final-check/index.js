var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/.pnpm/@cloudflare+unenv-preset@2.16.1_unenv@2.0.0-rc.24_workerd@1.20260820.1/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/.pnpm/@cloudflare+unenv-preset@2.16.1_unenv@2.0.0-rc.24_workerd@1.20260820.1/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/.pnpm/wrangler@4.125.0_@cloudflare+workers-types@4.20260702.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/.pnpm/@cloudflare+unenv-preset@2.16.1_unenv@2.0.0-rc.24_workerd@1.20260820.1/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/.pnpm/wrangler@4.125.0_@cloudflare+workers-types@4.20260702.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context2.error = err;
            res = await onError(err, context2);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/utils/body.js
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count3 = 0;
        for (const k in headers) {
          if (++count3 > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/utils.js
var createNullObject = /* @__PURE__ */ __name(() => /* @__PURE__ */ Object.create(null), "createNullObject");

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context2, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context2.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    `^${path.replace(
      /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
      (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ONLY_WILDCARD_REG_EXP_STR : `/:${LABEL_REG_EXP_STR}`
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: createNullObject() };
    this.#routes = { [METHOD_NAME_ALL]: createNullObject() };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap[METHOD_NAME_ALL]) {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") {
      path = "*";
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) {
        if (!middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      }
      for (const handlerMap of [middleware, routes]) {
        for (const m of methods) {
          for (const p in handlerMap[m]) {
            re.test(p) && handlerMap[m][p].push([handler, path]);
          }
        }
      }
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) {
      for (const m of methods) {
        if (!routes[m][path2]) {
          this.#insertPath(m, path2);
          routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        }
        routes[m][path2].push([handler, path2]);
      }
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) {
      matchers[method] = this.#buildMatcher(method);
    }
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
          continue;
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]];
            return map;
          }, createNullObject())
        ]);
      }
    }
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap];
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node2();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/.pnpm/hono@4.13.4/node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    } else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else {
      return () => "";
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (exposeHeadersStr) {
      set("Access-Control-Expose-Headers", exposeHeadersStr);
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        c.res.headers.append("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) {
        set("Access-Control-Allow-Methods", allowMethods);
      }
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
        }
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/models.ts
var MODEL_IDS = [
  "gpt-5",
  "gpt-5.3-codex-spark",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.5",
  "gpt-5.6",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna"
];
var MODEL_PRESETS = [
  {
    id: "gpt-5-codex-low",
    label: "gpt-5-codex low",
    description: "Fastest responses with limited reasoning",
    model: "gpt-5-codex",
    effort: "low"
  },
  {
    id: "gpt-5-codex-medium",
    label: "gpt-5-codex medium",
    description: "Dynamically adjusts reasoning based on the task",
    model: "gpt-5-codex",
    effort: "medium"
  },
  {
    id: "gpt-5-codex-high",
    label: "gpt-5-codex high",
    description: "Maximizes reasoning depth for complex or ambiguous problems",
    model: "gpt-5-codex",
    effort: "high"
  },
  {
    id: "gpt-5-minimal",
    label: "gpt-5 minimal",
    description: "Fastest responses with little reasoning",
    model: "gpt-5",
    effort: "minimal"
  },
  {
    id: "gpt-5-low",
    label: "gpt-5 low",
    description: "Balances speed with some reasoning; useful for straightforward queries and short explanations",
    model: "gpt-5",
    effort: "low"
  },
  {
    id: "gpt-5-medium",
    label: "gpt-5 medium",
    description: "Provides a solid balance of reasoning depth and latency for general-purpose tasks",
    model: "gpt-5",
    effort: "medium"
  },
  {
    id: "gpt-5-high",
    label: "gpt-5 high",
    description: "Maximizes reasoning depth for complex or ambiguous problems",
    model: "gpt-5",
    effort: "high"
  }
];
function getModelPreset(presetId) {
  return MODEL_PRESETS.find((preset) => preset.id === presetId);
}
__name(getModelPreset, "getModelPreset");
function isModelPreset(id) {
  return MODEL_PRESETS.some((preset) => preset.id === id);
}
__name(isModelPreset, "isModelPreset");
function getReasoningEffortForModel(modelOrPresetId, defaultEffort = "minimal") {
  const preset = getModelPreset(modelOrPresetId);
  return preset ? preset.effort : defaultEffort;
}
__name(getReasoningEffortForModel, "getReasoningEffortForModel");

// src/utils.ts
function normalizeModelName(name, debugModel, defaultModel) {
  if (typeof debugModel === "string" && debugModel.trim()) {
    return debugModel.trim();
  }
  if (typeof name !== "string" || !name.trim()) {
    const fallback2 = defaultModel?.trim() || "gpt-5.6-luna";
    return fallback2 === "gpt-5.6" ? "gpt-5.6-luna" : fallback2;
  }
  const base = name.split(":", 1)[0].trim();
  const preset = getModelPreset(base);
  if (preset) {
    return preset.model;
  }
  const mapping = {
    gpt5: "gpt-5",
    "gpt-5-latest": "gpt-5",
    "gpt-5": "gpt-5",
    "gpt-5.6": "gpt-5.6-luna",
    "homelab-codex": "gpt-5.6-luna",
    codex: "codex-mini-latest",
    "codex-mini": "codex-mini-latest",
    "codex-mini-latest": "codex-mini-latest"
  };
  return mapping[base] || base;
}
__name(normalizeModelName, "normalizeModelName");
function convertChatMessagesToResponsesInput(messages) {
  const inputItems = [];
  function _normalizeImageDataURL(url) {
    try {
      if (typeof url !== "string") {
        return url;
      }
      if (!url.startsWith("data:image/")) {
        return url;
      }
      if (!url.includes(";base64,")) {
        return url;
      }
      const [header, data] = url.split(",", 2);
      let decodedData = data.trim().replace(/\n/g, "").replace(/\r/g, "");
      decodedData = decodedData.replace(/-/g, "+").replace(/_/g, "/");
      const pad = -decodedData.length % 4;
      if (pad) {
        decodedData = decodedData + "=".repeat(pad);
      }
      try {
        atob(decodedData);
      } catch {
        return url;
      }
      return `${header},${decodedData}`;
    } catch {
      return url;
    }
  }
  __name(_normalizeImageDataURL, "_normalizeImageDataURL");
  for (const message of messages) {
    const role = message.role;
    if (role === "system") {
      continue;
    }
    if (role === "tool") {
      const callId = message.tool_call_id || message.id;
      if (typeof callId === "string" && callId) {
        let content2 = message.content || "";
        if (Array.isArray(content2)) {
          const texts = [];
          for (const part of content2) {
            if (typeof part === "object" && part !== null) {
              const t = part.text || part.content;
              if (typeof t === "string" && t) {
                texts.push(t);
              }
            }
          }
          content2 = texts.join("\n");
        }
        if (typeof content2 === "string") {
          inputItems.push({
            type: "function_call_output",
            call_id: callId,
            output: content2
          });
        }
      }
      continue;
    }
    if (role === "assistant" && Array.isArray(message.tool_calls)) {
      for (const tc of message.tool_calls) {
        if (typeof tc !== "object" || tc === null) {
          continue;
        }
        const tcType = tc.type || "function";
        if (tcType !== "function") {
          continue;
        }
        const callId = tc.id || tc.call_id;
        const fn = tc.function;
        const name = typeof fn === "object" && fn !== null ? fn.name : null;
        const args = typeof fn === "object" && fn !== null ? fn.arguments : null;
        if (typeof callId === "string" && typeof name === "string" && typeof args === "string") {
          inputItems.push({
            type: "function_call",
            name,
            arguments: args,
            call_id: callId
          });
        }
      }
    }
    const content = message.content || "";
    const contentItems = [];
    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part !== "object" || part === null) {
          continue;
        }
        const ptype = part.type;
        if (ptype === "text") {
          const text = part.text || part.content || "";
          if (typeof text === "string" && text) {
            const kind = role === "assistant" ? "output_text" : "input_text";
            contentItems.push({ type: kind, text });
          }
        } else if (ptype === "image_url") {
          const image = part.image_url;
          const url = typeof image === "object" && image !== null ? image.url : image;
          if (typeof url === "string" && url) {
            contentItems.push({ type: "input_image", image_url: _normalizeImageDataURL(url) });
          }
        }
      }
    } else if (typeof content === "string" && content) {
      const kind = role === "assistant" ? "output_text" : "input_text";
      contentItems.push({ type: kind, text: content });
    }
    if (!contentItems.length) {
      continue;
    }
    const roleOut = role === "assistant" ? "assistant" : "user";
    inputItems.push({ type: "message", role: roleOut, content: contentItems });
  }
  return inputItems;
}
__name(convertChatMessagesToResponsesInput, "convertChatMessagesToResponsesInput");
function convertToolsChatToResponses(tools) {
  const out = [];
  if (!Array.isArray(tools)) {
    return out;
  }
  for (const t of tools) {
    if (typeof t !== "object" || t === null) {
      continue;
    }
    if (t.type !== "function") {
      continue;
    }
    const fn = t.function;
    if (typeof fn !== "object" || fn === null) {
      continue;
    }
    const name = fn.name;
    if (typeof name !== "string" || !name) {
      continue;
    }
    const desc = fn.description;
    const params = fn.parameters;
    out.push({
      type: "function",
      function: {
        name,
        description: desc || "",
        parameters: params || { type: "object", properties: {} }
      }
    });
  }
  return out;
}
__name(convertToolsChatToResponses, "convertToolsChatToResponses");

// src/instructions.ts
async function getBaseInstructions() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/prompt.md"
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch base instructions: ${response.status}`);
    }
    return await response.text();
  } catch {
    return `You are a coding agent running in the Codex CLI, a terminal-based coding assistant. You are expected to be precise, safe, and helpful.`;
  }
}
__name(getBaseInstructions, "getBaseInstructions");
async function getGpt5CodexInstructions() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/gpt_5_codex_prompt.md"
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch GPT-5 Codex instructions: ${response.status}`);
    }
    return await response.text();
  } catch {
    return await getBaseInstructions();
  }
}
__name(getGpt5CodexInstructions, "getGpt5CodexInstructions");
function shouldUseGpt5CodexInstructions(model) {
  return model.startsWith("gpt-5-codex") || model.startsWith("codex-");
}
__name(shouldUseGpt5CodexInstructions, "shouldUseGpt5CodexInstructions");
async function getInstructionsForModel(model) {
  if (shouldUseGpt5CodexInstructions(model)) {
    return await getGpt5CodexInstructions();
  }
  return await getBaseInstructions();
}
__name(getInstructionsForModel, "getInstructionsForModel");

// src/cache_key.ts
function normalizePrefix(prefix) {
  return (prefix || "").trim().replace(/\s+/g, " ");
}
__name(normalizePrefix, "normalizePrefix");
async function stablePromptCacheKey(conversationId, normalizedPrefix) {
  if (!conversationId) throw new Error("A conversation or request identifier is required");
  const seed = `${conversationId}
${normalizePrefix(normalizedPrefix)}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(stablePromptCacheKey, "stablePromptCacheKey");

// src/oauth_vault.ts
var KEY = "credential";
async function keyFrom(env2) {
  if (!env2.OAUTH_VAULT_KEY) throw new Error("oauth vault key is not configured");
  const raw2 = Uint8Array.from(atob(env2.OAUTH_VAULT_KEY), (c) => c.charCodeAt(0));
  if (raw2.byteLength !== 32) throw new Error("oauth vault key must be 32 bytes");
  return crypto.subtle.importKey("raw", raw2, "AES-GCM", false, ["encrypt", "decrypt"]);
}
__name(keyFrom, "keyFrom");
async function seal(env2, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFrom(env2), new TextEncoder().encode(JSON.stringify(value))));
  const output = new Uint8Array(iv.length + ciphertext.length);
  output.set(iv);
  output.set(ciphertext, iv.length);
  return `v1:${btoa(String.fromCharCode(...output))}`;
}
__name(seal, "seal");
async function open(env2, encoded) {
  if (!encoded.startsWith("v1:")) throw new Error("unsupported vault record version");
  const bytes2 = Uint8Array.from(atob(encoded.slice(3)), (c) => c.charCodeAt(0));
  const value = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes2.slice(0, 12) }, await keyFrom(env2), bytes2.slice(12));
  return JSON.parse(new TextDecoder().decode(value));
}
__name(open, "open");
var OAuthVault = class {
  constructor(state, env2) {
    this.state = state;
    this.env = env2;
  }
  state;
  env;
  static {
    __name(this, "OAuthVault");
  }
  async fetch(request) {
    if (request.method === "GET") {
      const stored = await this.state.storage.get(KEY);
      if (!stored) return Response.json({ found: false });
      try {
        return Response.json({ found: true, value: await open(this.env, stored) });
      } catch {
        return Response.json({ found: false }, { status: 503 });
      }
    }
    if (request.method !== "PUT") return new Response("Method Not Allowed", { status: 405 });
    try {
      await this.state.storage.put(KEY, await seal(this.env, await request.json()));
      return new Response(null, { status: 204 });
    } catch {
      return Response.json({ error: "vault_unavailable" }, { status: 503 });
    }
  }
};
async function vaultGet(env2) {
  if (!env2.OAUTH_VAULT) return null;
  const stub = env2.OAUTH_VAULT.get(env2.OAUTH_VAULT.idFromName("default"));
  const response = await stub.fetch("https://oauth-vault.internal/credential");
  if (!response.ok) return null;
  const body = await response.json();
  return body.found ? body.value || null : null;
}
__name(vaultGet, "vaultGet");
async function vaultPut(env2, value) {
  if (!env2.OAUTH_VAULT) return false;
  const stub = env2.OAUTH_VAULT.get(env2.OAUTH_VAULT.idFromName("default"));
  const response = await stub.fetch("https://oauth-vault.internal/credential", { method: "PUT", body: JSON.stringify(value) });
  return response.ok;
}
__name(vaultPut, "vaultPut");

// src/auth_store.ts
var AUTH_TOKENS_KEY = "auth_tokens";
var AUTH_LAST_REFRESH_KEY = "auth_last_refresh";
var AUTH_EXPIRES_AT_KEY = "auth_expires_at";
var REFRESH_INTERVAL_MS = 28 * 24 * 60 * 60 * 1e3;
var EXPIRY_SKEW_MS = 60 * 1e3;
function authSource(env2) {
  return env2.CODEX_AUTH_SOURCE === "secret" || env2.CODEX_AUTH_SOURCE === "vault" ? env2.CODEX_AUTH_SOURCE : "fallback";
}
__name(authSource, "authSource");
var refreshesInFlight = /* @__PURE__ */ new Map();
var OPERATION_STRENGTH = { get: 0, fresh: 1, refresh: 2 };
function logRefresh(account, errorClass, status) {
  const prefix = account.startsWith("account:") ? account.slice(8, 20) : account.slice(0, 12);
  console.error(
    `auth_refresh account=${prefix || "unknown"} error_class=${errorClass}${status ? ` status=${status}` : ""}`
  );
}
__name(logRefresh, "logRefresh");
function decode(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  if (input.length % 4) input += "=".repeat(4 - input.length % 4);
  return atob(input);
}
__name(decode, "decode");
function accountIdFor(tokens) {
  if (tokens.account_id) return tokens.account_id;
  if (!tokens.id_token || tokens.id_token.split(".").length !== 3) return null;
  try {
    const claims = JSON.parse(decode(tokens.id_token.split(".")[1]));
    return claims["https://api.openai.com/auth"]?.chatgpt_account_id || null;
  } catch {
    return null;
  }
}
__name(accountIdFor, "accountIdFor");
function isTokenData(value) {
  if (!value || typeof value !== "object") return false;
  const tokens = value;
  return typeof tokens.access_token === "string" && tokens.access_token.length > 0 && (tokens.refresh_token === void 0 || typeof tokens.refresh_token === "string" && tokens.refresh_token.length > 0) && (tokens.id_token === void 0 || typeof tokens.id_token === "string");
}
__name(isTokenData, "isTokenData");
function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}
__name(validDate, "validDate");
function jwtExpiry(tokens) {
  for (const token of [tokens.access_token, tokens.id_token]) {
    if (!token || token.split(".").length !== 3) continue;
    try {
      const payload = JSON.parse(decode(token.split(".")[1]));
      if (typeof payload.exp === "number" && Number.isFinite(payload.exp) && payload.exp > 0)
        return new Date(payload.exp * 1e3).toISOString();
    } catch {
    }
  }
  return null;
}
__name(jwtExpiry, "jwtExpiry");
function fallback(env2) {
  if (!env2.OPENAI_CODEX_AUTH) return null;
  try {
    const auth = JSON.parse(env2.OPENAI_CODEX_AUTH);
    if (!isTokenData(auth.tokens)) return null;
    return {
      tokens: auth.tokens,
      lastRefresh: validDate(auth.last_refresh),
      expiresAt: validDate(auth.expires_at) || jwtExpiry(auth.tokens)
    };
  } catch {
    return null;
  }
}
__name(fallback, "fallback");
function secretBootstrap(env2) {
  return fallback(env2);
}
__name(secretBootstrap, "secretBootstrap");
async function persistSecretFallback(env2, auth) {
  if (!env2.OAUTH_VAULT) return false;
  return vaultPut(env2, auth);
}
__name(persistSecretFallback, "persistSecretFallback");
async function loadBootstrap(env2, now, seed = true) {
  if (authSource(env2) === "secret") return fallback(env2);
  if (env2.OAUTH_VAULT) {
    try {
      const vaulted = await vaultGet(env2);
      if (vaulted) return vaulted;
    } catch {
      return null;
    }
    return null;
  }
  if (env2.KV) {
    try {
      const tokens = await env2.KV.get(AUTH_TOKENS_KEY, "json");
      if (isTokenData(tokens))
        return {
          tokens,
          lastRefresh: validDate(await env2.KV.get(AUTH_LAST_REFRESH_KEY)),
          expiresAt: validDate(await env2.KV.get(AUTH_EXPIRES_AT_KEY)) || jwtExpiry(tokens)
        };
    } catch {
    }
  }
  const source = fallback(env2);
  if (source && env2.KV && seed) {
    const seeded = { ...source, lastRefresh: source.lastRefresh || new Date(now).toISOString() };
    await projectToKv(env2, seeded, now);
    return seeded;
  }
  return source;
}
__name(loadBootstrap, "loadBootstrap");
async function projectToKv(env2, auth, now) {
  if (authSource(env2) === "secret") return;
  if (env2.OAUTH_VAULT) {
    if (!await vaultPut(env2, auth)) throw new Error("oauth vault unavailable");
    return;
  }
  if (!env2.KV) return;
  await env2.KV.put(AUTH_TOKENS_KEY, JSON.stringify(auth.tokens));
  await env2.KV.put(AUTH_LAST_REFRESH_KEY, auth.lastRefresh || new Date(now).toISOString());
  if (auth.expiresAt) await env2.KV.put(AUTH_EXPIRES_AT_KEY, auth.expiresAt);
  else await env2.KV.delete(AUTH_EXPIRES_AT_KEY);
}
__name(projectToKv, "projectToKv");
function authFingerprint(auth) {
  return JSON.stringify([auth.tokens, auth.lastRefresh, auth.expiresAt]);
}
__name(authFingerprint, "authFingerprint");
function needsRefresh(auth, now) {
  if (auth.expiresAt) return Date.parse(auth.expiresAt) <= now + EXPIRY_SKEW_MS;
  return !auth.lastRefresh || Date.parse(auth.lastRefresh) <= now - REFRESH_INTERVAL_MS;
}
__name(needsRefresh, "needsRefresh");
async function accountKeyFor(tokens) {
  const account = accountIdFor(tokens);
  if (account) return `account:${account}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(tokens.refresh_token || tokens.access_token)
  );
  return `token:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
__name(accountKeyFor, "accountKeyFor");
async function requestRefresh(env2, source, now, accountKey) {
  if (!source.tokens.refresh_token) {
    logRefresh(accountKey, "missing_refresh_token");
    return null;
  }
  const body = {
    client_id: env2.CHATGPT_LOCAL_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
    grant_type: "refresh_token",
    refresh_token: source.tokens.refresh_token,
    scope: "openid profile email"
  };
  for (let attempt = 0; attempt < 3; attempt += 1) try {
    const response = await fetch("https://auth.openai.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      let errorCode = "";
      try {
        errorCode = String((await response.clone().json()).error || "");
      } catch {
      }
      if (errorCode === "invalid_grant") throw new Error("reauthorization_required");
      if (response.status >= 500 || response.status === 429) {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
          continue;
        }
      }
      logRefresh(accountKey, "oauth_http", response.status);
      return null;
    }
    let refreshed;
    try {
      refreshed = await response.json();
    } catch {
      logRefresh(accountKey, "invalid_json");
      return null;
    }
    const returnedTokens = refreshed.tokens && typeof refreshed.tokens === "object" ? refreshed.tokens : refreshed;
    if (typeof returnedTokens.access_token !== "string" || !returnedTokens.access_token) {
      logRefresh(accountKey, "invalid_response");
      return null;
    }
    return {
      tokens: {
        id_token: typeof returnedTokens.id_token === "string" ? returnedTokens.id_token : source.tokens.id_token,
        access_token: returnedTokens.access_token,
        refresh_token: typeof returnedTokens.refresh_token === "string" && returnedTokens.refresh_token ? returnedTokens.refresh_token : source.tokens.refresh_token,
        account_id: typeof returnedTokens.account_id === "string" && returnedTokens.account_id ? returnedTokens.account_id : source.tokens.account_id
      },
      lastRefresh: new Date(now).toISOString(),
      expiresAt: typeof refreshed.expires_in === "number" && refreshed.expires_in > 0 ? new Date(now + refreshed.expires_in * 1e3).toISOString() : jwtExpiry({
        access_token: returnedTokens.access_token,
        id_token: returnedTokens.id_token,
        refresh_token: returnedTokens.refresh_token,
        account_id: returnedTokens.account_id
      })
    };
  } catch (error3) {
    if (error3 instanceof Error && error3.message === "reauthorization_required") throw error3;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
      continue;
    }
    logRefresh(accountKey, "network");
    return null;
  }
  return null;
}
__name(requestRefresh, "requestRefresh");
function codex(record) {
  const auth = record?.auth;
  return {
    tokens: auth?.tokens || { access_token: "" },
    lastRefresh: auth?.lastRefresh || null,
    expiresAt: auth?.expiresAt || null,
    accessToken: auth?.tokens.access_token || null,
    accountId: auth ? accountIdFor(auth.tokens) : null,
    ...record ? { generation: record.generation } : {}
  };
}
__name(codex, "codex");
async function coordinate(env2, source, now, operation) {
  const accountKey = await accountKeyFor(source.tokens);
  const active = refreshesInFlight.get(accountKey);
  if (active) {
    if (OPERATION_STRENGTH[operation] <= OPERATION_STRENGTH[active.operation]) return active.promise;
    await active.promise;
    const current = await loadBootstrap(env2, now, false);
    return current ? coordinate(env2, current, now, operation) : null;
  }
  const promise = (async () => {
    if (env2.AUTH_REFRESH_COORDINATOR) {
      const stub = env2.AUTH_REFRESH_COORDINATOR.get(env2.AUTH_REFRESH_COORDINATOR.idFromName(`${accountKey}:${authFingerprint(source)}`));
      const response = await stub.fetch("https://auth-refresh.internal/credential", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...env2.GATEWAY_BEARER_TOKEN ? { "X-Internal-Auth": env2.GATEWAY_BEARER_TOKEN } : {}
        },
        body: JSON.stringify({
          operation,
          now,
          force: operation === "refresh",
          source
        })
      });
      if (!response.ok) return null;
      return await response.json();
    }
    const before = authFingerprint(source);
    const updated = operation === "get" || operation === "fresh" && !needsRefresh(source, now) ? source : await requestRefresh(env2, source, now, accountKey);
    if (!updated) return { generation: 1, fingerprint: before, auth: source };
    const current = await loadBootstrap(env2, now, false);
    if (current && authFingerprint(current) !== before)
      return { generation: 2, fingerprint: authFingerprint(current), auth: current };
    await projectToKv(env2, updated, now);
    return { generation: 2, fingerprint: authFingerprint(updated), auth: updated };
  })();
  const inFlight = { operation, promise };
  refreshesInFlight.set(accountKey, inFlight);
  try {
    return await promise;
  } finally {
    if (refreshesInFlight.get(accountKey) === inFlight) refreshesInFlight.delete(accountKey);
  }
}
__name(coordinate, "coordinate");
var AuthStore = {
  async get(env2) {
    const now = Date.now();
    const source = await loadBootstrap(env2, now);
    return source ? codex(await coordinate(env2, source, now, "get")) : codex(null);
  },
  async getFresh(env2, now) {
    const source = await loadBootstrap(env2, now);
    return source ? codex(await coordinate(env2, source, now, "fresh")) : codex(null);
  },
  async refresh(env2, now) {
    const source = await loadBootstrap(env2, now);
    return source ? codex(await coordinate(env2, source, now, "refresh")) : codex(null);
  }
};

// src/upstream.ts
function safeUpstreamLocation(requestUrl) {
  try {
    const url = new URL(requestUrl);
    return `${url.host}${url.pathname}`;
  } catch {
    return "invalid-url";
  }
}
__name(safeUpstreamLocation, "safeUpstreamLocation");
function logUpstreamError(status, requestUrl, metadata) {
  console.error(`Upstream request failed status=${status} url=${safeUpstreamLocation(requestUrl)} ${metadata}`);
}
__name(logUpstreamError, "logUpstreamError");
function normalizeResponsesPayloadInput(payload) {
  if (typeof payload.input !== "string") return payload;
  return {
    ...payload,
    input: [{ type: "message", role: "user", content: payload.input }]
  };
}
__name(normalizeResponsesPayloadInput, "normalizeResponsesPayloadInput");
var PRIVATE_TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;
var PRIVATE_DESCRIPTION_MAX = 4096;
function normalizePrivateToolDescription(value) {
  if (typeof value !== "string") return void 0;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ").replace(/\s+/gu, " ").trim().slice(0, PRIVATE_DESCRIPTION_MAX).trim();
}
__name(normalizePrivateToolDescription, "normalizePrivateToolDescription");
function validParametersSchema(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const schema = value;
  if (schema.type !== "object") return false;
  if (schema.properties !== void 0 && (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties))) return false;
  if (schema.required !== void 0) {
    if (!Array.isArray(schema.required) || schema.required.some((item) => typeof item !== "string") || new Set(schema.required).size !== schema.required.length) return false;
    const properties = schema.properties || {};
    if (schema.required.some((item) => !(item in properties))) return false;
  }
  return true;
}
__name(validParametersSchema, "validParametersSchema");
function safePrivateOriginTools(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((tool) => {
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) return [];
    const candidate = tool;
    if (candidate.type !== "function" || typeof candidate.name !== "string" || !PRIVATE_TOOL_NAME.test(candidate.name)) return [];
    const safe = { type: "function", name: candidate.name };
    if (candidate.description !== void 0) {
      const description = normalizePrivateToolDescription(candidate.description);
      if (description !== void 0) safe.description = description;
    }
    if (!validParametersSchema(candidate.parameters)) return [];
    safe.parameters = candidate.parameters;
    if (typeof candidate.strict === "boolean") safe.strict = candidate.strict;
    return [safe];
  });
}
__name(safePrivateOriginTools, "safePrivateOriginTools");
function safePrivateOriginToolChoice(value) {
  if (value === "auto" || value === "none" || value === "required") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const choice = value;
  return choice.type === "function" && typeof choice.name === "string" && choice.name.trim() ? { type: "function", name: choice.name } : void 0;
}
__name(safePrivateOriginToolChoice, "safePrivateOriginToolChoice");
function normalizePrivateOriginPayload(payload, defaultReasoning) {
  const validEfforts = /* @__PURE__ */ new Set(["none", "low", "medium", "high", "xhigh", "max"]);
  const rawReasoning = payload.reasoning;
  const sanitizedTools = safePrivateOriginTools(payload.tools);
  const sanitizedToolChoice = safePrivateOriginToolChoice(payload.tool_choice);
  const validToolNames = new Set(sanitizedTools.map((tool) => tool.name));
  const usableToolChoice = sanitizedToolChoice && typeof sanitizedToolChoice === "object" && sanitizedToolChoice.type === "function" && !validToolNames.has(sanitizedToolChoice.name) ? void 0 : sanitizedToolChoice;
  const requestedEffort = typeof rawReasoning === "object" && rawReasoning !== null && typeof rawReasoning.effort === "string" ? rawReasoning.effort.trim().toLowerCase() : defaultReasoning?.effort;
  const normalizedEffort = requestedEffort === "minimal" ? "medium" : requestedEffort;
  const effort = normalizedEffort && validEfforts.has(normalizedEffort) ? normalizedEffort : void 0;
  return {
    model: payload.model,
    input: normalizeResponsesPayloadInput(payload).input,
    stream: true,
    store: false,
    ...sanitizedTools.length ? { tools: sanitizedTools } : {},
    ...usableToolChoice !== void 0 ? { tool_choice: usableToolChoice } : {},
    ...typeof payload.parallel_tool_calls === "boolean" ? { parallel_tool_calls: payload.parallel_tool_calls } : {},
    ...effort ? { reasoning: { effort } } : {}
  };
}
__name(normalizePrivateOriginPayload, "normalizePrivateOriginPayload");
async function startUpstreamRequest(env2, model, inputItems, options) {
  const { instructions, tools, toolChoice, parallelToolCalls, reasoningParam } = options || {};
  const privateOriginMode = env2.UPSTREAM_MODE === "private-origin";
  if (privateOriginMode && (!env2.CODEX_PRIVATE_ORIGIN || !env2.CODEX_PRIVATE_ORIGIN_TOKEN || env2.OPENAI_PROVIDER === "chatgpt-oauth" && authSource(env2) !== "secret" && (!env2.OAUTH_VAULT || !env2.OAUTH_VAULT_KEY))) {
    return {
      response: null,
      error: new Response(JSON.stringify({ error: { message: "Private origin is not configured" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
  if (env2.OPENAI_PROVIDER !== "openai-api" && env2.OPENAI_PROVIDER !== "chatgpt-oauth") {
    return {
      response: null,
      error: new Response(JSON.stringify({ error: { message: "OpenAI API provider is not enabled" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
  const isChatGptOAuth = env2.OPENAI_PROVIDER === "chatgpt-oauth";
  if (!isChatGptOAuth && !env2.OPENAI_API_KEY) {
    return {
      response: null,
      error: new Response(JSON.stringify({ error: { message: "OpenAI API provider is not configured" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
  const oauthAuth = isChatGptOAuth ? await AuthStore.getFresh(env2, Date.now()) : null;
  if (isChatGptOAuth && !oauthAuth?.accessToken) {
    return {
      response: null,
      error: new Response(JSON.stringify({ error: { message: "ChatGPT OAuth provider is not configured" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
  const include = [];
  if (reasoningParam?.effort !== "none") {
    include.push("reasoning.encrypted_content");
  }
  const requestUrl = isChatGptOAuth ? env2.CHATGPT_RESPONSES_URL || "https://chatgpt.com/backend-api/codex/responses" : "https://api.openai.com/v1/responses";
  const sessionId = options?.promptCacheKey || await stablePromptCacheKey(crypto.randomUUID(), instructions || model);
  const baseInstructions = instructions || (options?.rawResponsesBody === void 0 ? await getInstructionsForModel(model) : "");
  const responsesPayload = options?.responsesPayload;
  const requestBody = options?.rawResponsesBody !== void 0 ? (() => {
    try {
      const parsed = (privateOriginMode ? (payload) => normalizePrivateOriginPayload(payload, reasoningParam) : normalizeResponsesPayloadInput)(JSON.parse(options.rawResponsesBody));
      return JSON.stringify({
        ...parsed,
        model: normalizeModelName(typeof parsed.model === "string" ? parsed.model : model, env2.DEBUG_MODEL, model)
      });
    } catch {
      return options.rawResponsesBody;
    }
  })() : responsesPayload ? JSON.stringify({
    ...privateOriginMode ? normalizePrivateOriginPayload(structuredClone(responsesPayload), reasoningParam) : structuredClone(responsesPayload),
    model: normalizeModelName(model, env2.DEBUG_MODEL),
    stream: true,
    prompt_cache_key: sessionId,
    instructions: instructions || baseInstructions
  }) : JSON.stringify({
    model: normalizeModelName(model, env2.DEBUG_MODEL),
    instructions: instructions || baseInstructions,
    // Use fetched instructions
    input: inputItems,
    tools: tools || [],
    tool_choice: toolChoice && (toolChoice === "auto" || toolChoice === "none" || toolChoice === "required" || typeof toolChoice === "object") || toolChoice === void 0 ? toolChoice || "auto" : "auto",
    parallel_tool_calls: parallelToolCalls || false,
    store: false,
    stream: true,
    include,
    prompt_cache_key: sessionId,
    ...reasoningParam && { reasoning: reasoningParam }
  });
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "codex_cli_rs/0.149.1"
  };
  if (privateOriginMode) {
    return startPrivateOriginRequest(
      env2.CODEX_PRIVATE_ORIGIN,
      env2.CODEX_PRIVATE_ORIGIN_TOKEN,
      requestBody,
      oauthAuth?.accessToken || null,
      oauthAuth?.accountId || null,
      options?.signal
    );
  }
  if (isChatGptOAuth) {
    headers["Authorization"] = `Bearer ${oauthAuth.accessToken}`;
    if (oauthAuth.accountId) headers["ChatGPT-Account-ID"] = oauthAuth.accountId;
    headers["originator"] = "codex_cli_rs";
    headers["Origin"] = "https://chatgpt.com";
    headers["Referer"] = "https://chatgpt.com/";
    headers["Accept-Language"] = "en-US,en;q=0.9";
    headers["x-client-request-id"] = crypto.randomUUID();
  } else {
    headers["Authorization"] = `Bearer ${env2.OPENAI_API_KEY}`;
  }
  try {
    headers["Accept"] = isChatGptOAuth ? "text/event-stream" : JSON.parse(requestBody).stream === true ? "text/event-stream" : "application/json";
  } catch (error3) {
    headers["Accept"] = isChatGptOAuth ? "text/event-stream" : "application/json";
  }
  if (isChatGptOAuth) headers["OpenAI-Beta"] = "responses=2026-02-06";
  if (isChatGptOAuth && (env2.CHATGPT_TRANSPORT || "websocket") === "websocket") {
    const websocketResult = await startChatGptWebSocket(requestUrl, headers, requestBody, options?.signal);
    if (authSource(env2) === "fallback" && websocketResult.error?.status === 401 && env2.OAUTH_VAULT) {
      const secretAuth = secretBootstrap(env2);
      if (secretAuth && authFingerprint(secretAuth) !== authFingerprint(oauthAuth)) {
        const fallbackHeaders = new Headers(headers);
        fallbackHeaders.set("Authorization", `Bearer ${secretAuth.tokens.access_token}`);
        if (secretAuth.tokens.account_id) fallbackHeaders.set("ChatGPT-Account-ID", secretAuth.tokens.account_id);
        const fallbackResult = await startChatGptWebSocket(requestUrl, fallbackHeaders, requestBody, options?.signal);
        if (!fallbackResult.error) await persistSecretFallback(env2, secretAuth);
        return fallbackResult;
      }
    }
    return websocketResult;
  }
  const request = /* @__PURE__ */ __name(() => fetch(requestUrl, {
    method: "POST",
    headers,
    body: requestBody,
    signal: options?.signal
  }), "request");
  try {
    let upstreamResponse = await request();
    if (isChatGptOAuth && authSource(env2) === "fallback" && env2.OAUTH_VAULT && upstreamResponse.status === 401) {
      const secretAuth = secretBootstrap(env2);
      if (secretAuth && authFingerprint(secretAuth) !== authFingerprint(oauthAuth)) {
        headers["Authorization"] = `Bearer ${secretAuth.tokens.access_token}`;
        if (secretAuth.tokens.account_id) headers["ChatGPT-Account-ID"] = secretAuth.tokens.account_id;
        upstreamResponse = await request();
        if (upstreamResponse.ok) await persistSecretFallback(env2, secretAuth);
      }
    }
    if (!upstreamResponse.ok) {
      logUpstreamError(upstreamResponse.status, requestUrl, "kind=http method=POST");
      return {
        response: null,
        error: new Response(
          JSON.stringify({
            error: {
              message: "Upstream request failed"
            }
          }),
          { status: upstreamResponse.status, headers: { "Content-Type": "application/json" } }
        )
      };
    }
    return { response: upstreamResponse, error: null };
  } catch {
    logUpstreamError("fetch-failed", requestUrl, "kind=network method=POST");
    return {
      response: null,
      error: new Response(
        JSON.stringify({
          error: {
            message: "Upstream request failed"
          }
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    };
  }
}
__name(startUpstreamRequest, "startUpstreamRequest");
async function startPrivateOriginRequest(origin, originToken, requestBody, chatGptToken, accountId, signal) {
  try {
    const upstreamResponse = await origin.fetch("http://127.0.0.1/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${originToken}`,
        ...chatGptToken ? { "X-ChatGPT-OAuth-Authorization": `Bearer ${chatGptToken}` } : {},
        ...accountId ? { "ChatGPT-Account-ID": accountId } : {},
        "Content-Type": "application/json",
        Accept: requestBody.includes('"stream":true') ? "text/event-stream" : "application/json"
      },
      body: requestBody,
      signal
    });
    if (!upstreamResponse.ok) {
      return {
        response: null,
        error: new Response(JSON.stringify({ error: { message: "Private origin request failed" } }), {
          status: upstreamResponse.status,
          headers: { "Content-Type": "application/json" }
        })
      };
    }
    return {
      response: upstreamResponse,
      error: null,
      alreadySse: upstreamResponse.headers.get("content-type")?.includes("text/event-stream") === true
    };
  } catch {
    return {
      response: null,
      error: new Response(JSON.stringify({ error: { message: "Private origin request failed" } }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
}
__name(startPrivateOriginRequest, "startPrivateOriginRequest");
async function startChatGptWebSocket(requestUrl, headers, requestBody, signal) {
  const wsHeaders = new Headers(headers);
  wsHeaders.set("Upgrade", "websocket");
  wsHeaders.set("Accept", "text/event-stream");
  wsHeaders.set("OpenAI-Beta", "responses_websockets=2026-02-06");
  wsHeaders.set("Origin", "https://chatgpt.com");
  wsHeaders.set("Referer", "https://chatgpt.com/");
  wsHeaders.set("Accept-Language", "en-US,en;q=0.9");
  wsHeaders.set("x-client-request-id", crypto.randomUUID());
  wsHeaders.set("x-codex-installation-id", crypto.randomUUID());
  try {
    const upstream = await fetch(requestUrl, { method: "GET", headers: wsHeaders, signal });
    if (!upstream.ok) {
      const accessDenied = upstream.status === 401 || upstream.status === 403;
      return {
        response: null,
        error: new Response(
          JSON.stringify({
            error: {
              message: accessDenied ? "Upstream WebSocket access denied" : "Upstream WebSocket handshake failed"
            }
          }),
          { status: upstream.status, headers: { "Content-Type": "application/json" } }
        )
      };
    }
    const socket = upstream.webSocket;
    if (!socket)
      return {
        response: null,
        error: new Response(JSON.stringify({ error: { message: "Upstream WebSocket upgrade failed" } }), {
          status: 502,
          headers: { "Content-Type": "application/json" }
        })
      };
    socket.accept({ allowHalfOpen: true });
    const body = normalizeWebSocketPayload(requestBody);
    try {
      socket.send(JSON.stringify({ type: "response.create", response: body }));
    } catch {
      try {
        socket.close();
      } catch {
      }
      return {
        response: null,
        error: new Response(JSON.stringify({ error: { message: "Upstream WebSocket request failed" } }), {
          status: 502,
          headers: { "Content-Type": "application/json" }
        })
      };
    }
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const close = /* @__PURE__ */ __name(() => {
          try {
            socket.close();
          } catch {
          }
          controller.close();
        }, "close");
        const onAbort = /* @__PURE__ */ __name(() => close(), "onAbort");
        if (signal) signal.addEventListener("abort", onAbort, { once: true });
        socket.addEventListener("message", (event) => {
          try {
            if (typeof event.data !== "string") return;
            const parsed = JSON.parse(event.data);
            const data = `data: ${JSON.stringify(parsed)}

`;
            controller.enqueue(encoder.encode(data));
            if (["response.completed", "response.failed", "response.incomplete"].includes(String(parsed.type))) close();
          } catch {
          }
        });
        socket.addEventListener("close", close, { once: true });
        socket.addEventListener("error", close, { once: true });
      }
    });
    return {
      response: new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
      }),
      error: null,
      alreadySse: true
    };
  } catch {
    return {
      response: null,
      error: new Response(JSON.stringify({ error: { message: "Upstream WebSocket request failed" } }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
}
__name(startChatGptWebSocket, "startChatGptWebSocket");
function normalizeWebSocketPayload(requestBody) {
  const body = JSON.parse(requestBody);
  return { ...body, stream: true, store: false };
}
__name(normalizeWebSocketPayload, "normalizeWebSocketPayload");

// src/reasoning.ts
var OFFICIAL_REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"];
function isValidReasoningEffort(effort) {
  const normalized = effort.trim().toLowerCase();
  return OFFICIAL_REASONING_EFFORTS.includes(normalized === "minimal" ? "medium" : normalized);
}
__name(isValidReasoningEffort, "isValidReasoningEffort");
function buildReasoningParam(baseEffort = "medium", baseSummary = "auto", overrides) {
  let effort = (baseEffort || "").trim().toLowerCase();
  let summary = (baseSummary || "").trim().toLowerCase();
  const validEfforts = /* @__PURE__ */ new Set([...OFFICIAL_REASONING_EFFORTS, "minimal"]);
  const validSummaries = /* @__PURE__ */ new Set(["auto", "concise", "detailed", "none"]);
  if (overrides) {
    const oEff = (overrides.effort || "").trim().toLowerCase();
    const oSum = (overrides.summary || "").trim().toLowerCase();
    if (validEfforts.has(oEff) && oEff) {
      effort = oEff;
    }
    if (validSummaries.has(oSum) && oSum) {
      summary = oSum;
    }
  }
  if (effort === "minimal") effort = "medium";
  if (!validEfforts.has(effort)) effort = "medium";
  if (!validSummaries.has(summary)) {
    summary = "auto";
  }
  const reasoning = { effort };
  if (summary !== "none") {
    reasoning.summary = summary;
  }
  return reasoning;
}
__name(buildReasoningParam, "buildReasoningParam");
function applyReasoningToMessage(message, reasoningSummaryText, reasoningFullText, compat) {
  try {
    compat = (compat || "think-tags").trim().toLowerCase();
  } catch {
    compat = "think-tags";
  }
  if (compat === "o3") {
    const rtxtParts2 = [];
    if (typeof reasoningSummaryText === "string" && reasoningSummaryText.trim()) {
      rtxtParts2.push(reasoningSummaryText);
    }
    if (typeof reasoningFullText === "string" && reasoningFullText.trim()) {
      rtxtParts2.push(reasoningFullText);
    }
    const rtxt2 = rtxtParts2.filter((p) => p).join("\n\n");
    if (rtxt2) {
      message.reasoning = { content: [{ type: "text", text: rtxt2 }] };
    }
    return message;
  }
  if (compat === "legacy" || compat === "current") {
    if (reasoningSummaryText) {
      message.reasoning_summary = reasoningSummaryText;
    }
    if (reasoningFullText) {
      message.reasoning = reasoningFullText;
    }
    return message;
  }
  const rtxtParts = [];
  if (typeof reasoningSummaryText === "string" && reasoningSummaryText.trim()) {
    rtxtParts.push(reasoningSummaryText);
  }
  if (typeof reasoningFullText === "string" && reasoningFullText.trim()) {
    rtxtParts.push(reasoningFullText);
  }
  const rtxt = rtxtParts.filter((p) => p).join("\n\n");
  if (rtxt) {
    const thinkBlock = `<think>${rtxt}</think>`;
    const contentText = message.content || "";
    message.content = thinkBlock + (typeof contentText === "string" ? contentText : "");
  }
  return message;
}
__name(applyReasoningToMessage, "applyReasoningToMessage");

// src/sse.ts
var SAFE_ERROR = { message: "Upstream request failed" };
var SAFE_ERROR_MESSAGE = SAFE_ERROR.message;
var ERROR_CONTAINER_KEY = /^(?:error|raw_error|upstream_error|error_message)$/i;
var ERROR_TEXT_KEY = /^(?:message|details|code)$/i;
var AUTHORITATIVE_RESPONSE_KEY = /^(?:response|metadata|output|incomplete_details|usage)$/i;
var TOKEN_VALUE = /(?:Bearer\s+\S+|\b(?:access|refresh|auth|oauth|api|bearer|jwt|token)[-_][A-Za-z0-9._-]+|\bjwt\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\bsk-[A-Za-z0-9_-]+\b)/gi;
function sanitizeString(value, errorText) {
  if (errorText) return SAFE_ERROR_MESSAGE;
  return value.replace(TOKEN_VALUE, "[REDACTED]");
}
__name(sanitizeString, "sanitizeString");
function isSensitiveKey(key) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return normalized === "token" || /(?:authorization|accesstoken|refreshtoken|idtoken|authtoken|apikey)$/.test(normalized);
}
__name(isSensitiveKey, "isSensitiveKey");
function sanitizeValue(value, key, errorContext = false) {
  if (key && isSensitiveKey(key)) return void 0;
  const inheritedErrorContext = Boolean(key && AUTHORITATIVE_RESPONSE_KEY.test(key)) ? false : errorContext;
  const nestedErrorContext = inheritedErrorContext || Boolean(key && ERROR_CONTAINER_KEY.test(key));
  if (typeof value === "string") {
    const errorText = Boolean(key && (ERROR_TEXT_KEY.test(key) || ERROR_CONTAINER_KEY.test(key)));
    return sanitizeString(value, nestedErrorContext && errorText);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, void 0, nestedErrorContext));
  if (!value || typeof value !== "object") return value;
  const objectErrorContext = nestedErrorContext || isErrorLike(value.type);
  const sanitized = {};
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    const safeValue = sanitizeValue(nestedValue, nestedKey, objectErrorContext);
    if (safeValue !== void 0) sanitized[nestedKey] = safeValue;
  }
  return sanitized;
}
__name(sanitizeValue, "sanitizeValue");
function sanitizeEventData(value) {
  return sanitizeValue(value);
}
__name(sanitizeEventData, "sanitizeEventData");
function isErrorLike(type) {
  return typeof type === "string" && /(error|failed|incomplete|cancelled)/i.test(type);
}
__name(isErrorLike, "isErrorLike");
function enqueueSafeError(controller, encoder = new TextEncoder()) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: SAFE_ERROR })}

`));
}
__name(enqueueSafeError, "enqueueSafeError");
async function sseTranslateResponses(upstreamResponse) {
  const reader = upstreamResponse.body?.getReader();
  if (!reader) throw new Error("Upstream response body is not readable.");
  return new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });
          if (done) {
            buffer += decoder.decode();
            if (buffer) buffer += "\n";
          }
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const event = JSON.parse(data);
              const safeEvent = sanitizeEventData(event);
              if (isErrorLike(safeEvent.type) && !("error" in safeEvent)) safeEvent.error = SAFE_ERROR;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(safeEvent)}

`));
            } catch {
              enqueueSafeError(controller, encoder);
            }
          }
          if (done) break;
        }
      } catch {
        enqueueSafeError(controller, encoder);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    }
  });
}
__name(sseTranslateResponses, "sseTranslateResponses");
async function sseTranslateChat(upstreamResponse, model, created, verbose = false, reasoningCompat = "think-tags") {
  void verbose;
  const reader = upstreamResponse.body?.getReader();
  if (!reader) {
    throw new Error("Upstream response body is not readable.");
  }
  let responseId = "chatcmpl-stream";
  let thinkOpen = false;
  let thinkClosed = false;
  let sawAnySummary = false;
  let pendingSummaryParagraph = false;
  return new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });
          if (done) {
            buffer += decoder.decode();
            if (buffer) buffer += "\n";
          }
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }
            const data = line.substring("data: ".length).trim();
            if (!data) {
              continue;
            }
            if (data === "[DONE]") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              break;
            }
            let evt;
            try {
              evt = sanitizeEventData(JSON.parse(data));
            } catch {
              enqueueSafeError(controller);
              continue;
            }
            const kind = evt.type;
            if (evt.response && typeof evt.response.id === "string") {
              responseId = evt.response.id || responseId;
            }
            if (isErrorLike(kind)) {
              enqueueSafeError(controller);
            } else if (kind === "response.output_text.delta") {
              const delta = evt.delta || "";
              if (reasoningCompat === "think-tags" && thinkOpen && !thinkClosed) {
                const closeChunk = {
                  id: responseId,
                  object: "chat.completion.chunk",
                  created,
                  model,
                  choices: [{ index: 0, delta: { content: "</think>" }, finish_reason: null }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(closeChunk)}

`));
                thinkOpen = false;
                thinkClosed = true;
              }
              const chunk = {
                id: responseId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{ index: 0, delta: { content: delta }, finish_reason: null }]
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
            } else if (kind === "response.output_item.done") {
              const item = evt.item;
              if (item && item.type === "function_call") {
                const callId = item.call_id || item.id || "";
                const name = item.name || "";
                const args = item.arguments || "";
                if (typeof callId === "string" && typeof name === "string" && typeof args === "string") {
                  const deltaChunk = {
                    id: responseId,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [
                      {
                        index: 0,
                        delta: {
                          tool_calls: [
                            {
                              index: 0,
                              id: callId,
                              type: "function",
                              function: { name, arguments: args }
                            }
                          ]
                        },
                        finish_reason: null
                      }
                    ]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(deltaChunk)}

`));
                  const finishChunk = {
                    id: responseId,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finishChunk)}

`));
                }
              }
            } else if (kind === "response.reasoning_summary_part.added") {
              if (reasoningCompat === "think-tags" || reasoningCompat === "o3") {
                if (sawAnySummary) {
                  pendingSummaryParagraph = true;
                } else {
                  sawAnySummary = true;
                }
              }
            } else if (kind === "response.reasoning_summary_text.delta" || kind === "response.reasoning_text.delta") {
              const deltaTxt = evt.delta || "";
              if (reasoningCompat === "o3") {
                if (kind === "response.reasoning_summary_text.delta" && pendingSummaryParagraph) {
                  const nlChunk = {
                    id: responseId,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [
                      {
                        index: 0,
                        delta: { reasoning: { content: [{ type: "text", text: "\n" }] } },
                        finish_reason: null
                      }
                    ]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(nlChunk)}

`));
                  pendingSummaryParagraph = false;
                }
                const chunk = {
                  id: responseId,
                  object: "chat.completion.chunk",
                  created,
                  model,
                  choices: [
                    {
                      index: 0,
                      delta: { reasoning: { content: [{ type: "text", text: deltaTxt }] } },
                      finish_reason: null
                    }
                  ]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
              } else if (reasoningCompat === "think-tags") {
                if (!thinkOpen && !thinkClosed) {
                  const openChunk = {
                    id: responseId,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [{ index: 0, delta: { content: "<think>" }, finish_reason: null }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openChunk)}

`));
                  thinkOpen = true;
                }
                if (thinkOpen && !thinkClosed) {
                  if (kind === "response.reasoning_summary_text.delta" && pendingSummaryParagraph) {
                    const nlChunk = {
                      id: responseId,
                      object: "chat.completion.chunk",
                      created,
                      model,
                      choices: [{ index: 0, delta: { content: "\n" }, finish_reason: null }]
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(nlChunk)}

`));
                    pendingSummaryParagraph = false;
                  }
                  const contentChunk = {
                    id: responseId,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [{ index: 0, delta: { content: deltaTxt }, finish_reason: null }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(contentChunk)}

`));
                }
              } else {
                if (kind === "response.reasoning_summary_text.delta") {
                  const chunk = {
                    id: responseId,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [
                      {
                        index: 0,
                        delta: { reasoning_summary: deltaTxt },
                        finish_reason: null
                      }
                    ]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
                } else {
                  const chunk = {
                    id: responseId,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [{ index: 0, delta: { reasoning: deltaTxt }, finish_reason: null }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
                }
              }
            } else if (typeof kind === "string" && kind.endsWith(".done")) {
            } else if (kind === "response.output_text.done") {
              const chunk = {
                id: responseId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
            } else if (kind === "response.completed") {
              if (reasoningCompat === "think-tags" && thinkOpen && !thinkClosed) {
                const closeChunk = {
                  id: responseId,
                  object: "chat.completion.chunk",
                  created,
                  model,
                  choices: [{ index: 0, delta: { content: "</think>" }, finish_reason: null }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(closeChunk)}

`));
                thinkOpen = false;
                thinkClosed = true;
              }
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              break;
            }
          }
          if (done) break;
        }
      } catch {
        enqueueSafeError(controller);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    }
  });
}
__name(sseTranslateChat, "sseTranslateChat");
async function sseTranslateText(upstreamResponse, model, created, verbose = false) {
  void verbose;
  const reader = upstreamResponse.body?.getReader();
  if (!reader) {
    throw new Error("Upstream response body is not readable.");
  }
  let responseId = "cmpl-stream";
  return new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });
          if (done) {
            buffer += decoder.decode();
            if (buffer) buffer += "\n";
          }
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }
            const data = line.substring("data: ".length).trim();
            if (!data || data === "[DONE]") {
              if (data === "[DONE]") {
                const chunk = {
                  id: responseId,
                  object: "text_completion.chunk",
                  created,
                  model,
                  choices: [{ index: 0, text: "", finish_reason: "stop" }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
              }
              continue;
            }
            let evt;
            try {
              evt = sanitizeEventData(JSON.parse(data));
            } catch {
              enqueueSafeError(controller);
              continue;
            }
            const kind = evt.type;
            if (evt.response && typeof evt.response.id === "string") {
              responseId = evt.response.id || responseId;
            }
            if (isErrorLike(kind)) {
              enqueueSafeError(controller);
            } else if (kind === "response.output_text.delta") {
              const deltaText = evt.delta || "";
              const chunk = {
                id: responseId,
                object: "text_completion.chunk",
                created,
                model,
                choices: [{ index: 0, text: deltaText, finish_reason: null }]
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
            } else if (kind === "response.output_text.done") {
              const chunk = {
                id: responseId,
                object: "text_completion.chunk",
                created,
                model,
                choices: [{ index: 0, text: "", finish_reason: "stop" }]
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
            } else if (kind === "response.completed") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              break;
            }
          }
          if (done) break;
        }
      } catch {
        enqueueSafeError(controller);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    }
  });
}
__name(sseTranslateText, "sseTranslateText");

// src/middleware/openaiAuthMiddleware.ts
function openaiAuthMiddleware() {
  return async (c, next) => {
    const authHeader = c.req.header("X-Gateway-Authorization") ?? c.req.header("Authorization");
    const configuredKey = c.env.GATEWAY_BEARER_TOKEN;
    const providedKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (configuredKey && providedKey && providedKey === configuredKey) {
      return next();
    }
    const accessClientId = c.req.header("CF-Access-Client-Id");
    const accessClientSecret = c.req.header("CF-Access-Client-Secret");
    if (accessClientId && accessClientSecret && c.env.ACCESS_SERVICE_TOKEN_CLIENT_ID && c.env.ACCESS_SERVICE_TOKEN_CLIENT_SECRET && accessClientId === c.env.ACCESS_SERVICE_TOKEN_CLIENT_ID && accessClientSecret === c.env.ACCESS_SERVICE_TOKEN_CLIENT_SECRET) {
      return next();
    }
    if (await verifyAccessAssertion(c.req.header("Cf-Access-Jwt-Assertion"), c.req.path, c.env)) {
      return next();
    }
    return c.json({ error: { message: "Unauthorized" } }, 401);
  };
}
__name(openaiAuthMiddleware, "openaiAuthMiddleware");
var certCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 5 * 60 * 1e3;
function accessIssuer(domain2) {
  if (!domain2) return void 0;
  try {
    const url = new URL(domain2.includes("://") ? domain2 : `https://${domain2}`);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" && url.pathname !== "") return void 0;
    return `https://${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return void 0;
  }
}
__name(accessIssuer, "accessIssuer");
async function verifyAccessAssertion(assertion, path, env2) {
  const issuer = accessIssuer(env2.ACCESS_TEAM_DOMAIN);
  const audience = path.startsWith("/api/") ? env2.ACCESS_AUDIENCE_API ?? env2.ACCESS_AUDIENCE : env2.ACCESS_AUDIENCE_V1 ?? env2.ACCESS_AUDIENCE;
  if (!assertion || !issuer || !audience) return false;
  const parts = assertion.split(".");
  if (parts.length !== 3) return false;
  try {
    const base64url = /* @__PURE__ */ __name((value) => value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4), "base64url");
    const decode2 = /* @__PURE__ */ __name((value) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64url(value)), (ch) => ch.charCodeAt(0)))), "decode");
    const header = decode2(parts[0]);
    const claims = decode2(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string" || claims.iss !== issuer || claims.type !== "app" || typeof claims.common_name !== "string" || !claims.common_name) return false;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(audience) || typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1e3)) return false;
    let keys = certCache.get(issuer);
    if (!keys || keys.expires <= Date.now()) {
      const response = await fetch(`${issuer}/cdn-cgi/access/certs`);
      if (!response.ok) return false;
      const body = await response.json();
      if (!Array.isArray(body.keys)) return false;
      keys = { expires: Date.now() + CACHE_TTL_MS, keys: body.keys };
      certCache.set(issuer, keys);
    }
    const jwk = keys.keys?.find((key) => key.kid === header.kid && key.alg === "RS256" && key.kty === "RSA");
    if (!jwk) return false;
    const cryptoKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const bytes2 = /* @__PURE__ */ __name((value) => Uint8Array.from(atob(base64url(value)), (ch) => ch.charCodeAt(0)), "bytes");
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, bytes2(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return false;
  }
}
__name(verifyAccessAssertion, "verifyAccessAssertion");

// src/conversation.ts
function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}
__name(firstString, "firstString");
async function resolvePromptCacheKey(payload, headers, prefix) {
  const explicitCacheKey = firstString(
    payload.prompt_cache_key,
    headers.get("prompt-cache-key"),
    headers.get("x-prompt-cache-key")
  );
  if (explicitCacheKey) return explicitCacheKey;
  const stableConversationId = firstString(
    payload.conversation_id,
    payload.conversation,
    headers.get("conversation-id"),
    headers.get("x-conversation-id")
  );
  const requestId = firstString(
    headers.get("session-id"),
    headers.get("x-session-id"),
    headers.get("request-id"),
    headers.get("x-request-id")
  );
  return stablePromptCacheKey(stableConversationId || requestId || crypto.randomUUID(), prefix);
}
__name(resolvePromptCacheKey, "resolvePromptCacheKey");

// src/routes/openai.ts
var openai = new Hono2();
openai.post("/v1/chat/completions", openaiAuthMiddleware(), async (c) => {
  const verbose = c.env.VERBOSE === "true";
  let reasoningEffort = c.env.REASONING_EFFORT || "medium";
  const reasoningSummary = c.env.REASONING_SUMMARY || "auto";
  const reasoningCompat = c.env.REASONING_COMPAT || "think-tags";
  const debugModel = c.env.DEBUG_MODEL;
  if (verbose) {
    console.log("POST /v1/chat/completions");
  }
  let payload;
  try {
    const raw2 = await c.req.text();
    if (!raw2) {
      payload = {};
    } else {
      payload = JSON.parse(raw2);
    }
  } catch {
    try {
      const raw2 = (await c.req.text()).replace(/\r/g, "").replace(/\n/g, "");
      payload = JSON.parse(raw2);
    } catch {
      return c.json({ error: { message: "Invalid JSON body" } }, 400);
    }
  }
  const modelInput = payload.model;
  const model = normalizeModelName(modelInput, debugModel, c.env.OPENAI_DEFAULT_MODEL);
  if (isModelPreset(modelInput)) {
    const presetEffort = getReasoningEffortForModel(
      modelInput,
      reasoningEffort
    );
    reasoningEffort = presetEffort;
  }
  let messages = payload.messages;
  if (!messages && typeof payload.prompt === "string") {
    messages = [{ role: "user", content: payload.prompt }];
  }
  if (!messages && typeof payload.input === "string") {
    messages = [{ role: "user", content: payload.input }];
  }
  if (!messages) {
    messages = [];
  }
  if (!Array.isArray(messages)) {
    return c.json({ error: { message: "Request must include messages: []" } }, 400);
  }
  const sysIdx = messages.findIndex((m) => {
    if (typeof m === "object" && m !== null) {
      const msg = m;
      return msg.role === "system";
    }
    return false;
  });
  if (sysIdx !== -1) {
    const sysMsg = messages.splice(sysIdx, 1)[0];
    const content = typeof sysMsg === "object" && sysMsg !== null && sysMsg.content || "";
    messages.unshift({ role: "user", content });
  }
  const isStream = Boolean(payload.stream);
  const toolsResponses = convertToolsChatToResponses(payload.tools);
  const toolChoice = payload.tool_choice || "auto";
  const parallelToolCalls = Boolean(payload.parallel_tool_calls);
  const inputItems = convertChatMessagesToResponsesInput(messages) || [];
  if (typeof payload.prompt === "string" && payload.prompt.trim()) {
    inputItems.push({ type: "message", role: "user", content: [{ type: "input_text", text: payload.prompt }] });
  }
  const reasoningOverrides = typeof payload.reasoning === "object" && payload.reasoning !== null ? payload.reasoning : void 0;
  const reasoningParam = buildReasoningParam(reasoningEffort, reasoningSummary, reasoningOverrides);
  if (verbose) {
    console.log("Authentication verified");
  }
  const instructions = await getInstructionsForModel(model);
  const promptCacheKey = await resolvePromptCacheKey(payload, c.req.raw.headers, instructions);
  const { response: upstream, error: errorResp } = await startUpstreamRequest(c.env, model, inputItems, {
    instructions,
    tools: toolsResponses,
    toolChoice,
    parallelToolCalls,
    reasoningParam,
    promptCacheKey
  });
  if (verbose) {
    console.log(
      `Upstream request: model=${model}, messages=${inputItems.length}, tools=${toolsResponses?.length || 0}`
    );
  }
  if (errorResp) {
    return errorResp;
  }
  if (!upstream) {
    return c.json({ error: { message: "Upstream request failed unexpectedly." } }, 500);
  }
  const created = Math.floor(Date.now() / 1e3);
  if (isStream) {
    return new Response(await sseTranslateChat(upstream, model, created, verbose, reasoningCompat), {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...c.res.headers
        // Include CORS headers from Hono middleware
      }
    });
  } else {
    let fullText = "";
    let reasoningSummaryText = "";
    let reasoningFullText = "";
    let responseId = "chatcmpl";
    const toolCalls = [];
    let errorMessage = null;
    try {
      const reader = upstream.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring("data: ".length).trim();
              if (data === "[DONE]") break;
              try {
                const evt = JSON.parse(data);
                const kind = evt.type;
                if (evt.response && typeof evt.response.id === "string") {
                  responseId = evt.response.id || responseId;
                }
                if (kind === "response.output_text.delta") {
                  fullText += evt.delta || "";
                } else if (kind === "response.reasoning_summary_text.delta") {
                  reasoningSummaryText += evt.delta || "";
                } else if (kind === "response.reasoning_text.delta") {
                  reasoningFullText += evt.delta || "";
                } else if (kind === "response.output_item.done") {
                  const item = evt.item || {};
                  if (item.type === "function_call") {
                    const callId = item.call_id || item.id || "";
                    const name = item.name || "";
                    const args = item.arguments || "";
                    if (typeof callId === "string" && typeof name === "string" && typeof args === "string") {
                      toolCalls.push({
                        id: callId,
                        type: "function",
                        function: { name, arguments: args }
                      });
                    }
                  }
                } else if (kind === "response.failed") {
                  errorMessage = evt.response && evt.response.error && evt.response.error.message || "response.failed";
                }
              } catch (parseError) {
                console.error("Error parsing non-streamed SSE data:", parseError);
              }
            }
          }
        }
      }
    } catch (streamError) {
      console.error("Error reading non-streamed upstream response:", streamError);
      errorMessage = `Error reading upstream response: ${streamError}`;
    }
    if (errorMessage) {
      return c.json({ error: { message: errorMessage } }, 502);
    }
    let message = { role: "assistant", content: fullText || null };
    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }
    message = applyReasoningToMessage(message, reasoningSummaryText, reasoningFullText, reasoningCompat);
    const completion = {
      id: responseId || "chatcmpl",
      object: "chat.completion",
      created,
      model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: "stop"
        }
      ]
    };
    return new Response(JSON.stringify(completion), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        ...c.res.headers
      }
    });
  }
});
openai.post("/v1/completions", openaiAuthMiddleware(), async (c) => {
  const verbose = c.env.VERBOSE === "true";
  const debugModel = c.env.DEBUG_MODEL;
  const reasoningEffort = c.env.REASONING_EFFORT || "medium";
  const reasoningSummary = c.env.REASONING_SUMMARY || "auto";
  if (verbose) {
    console.log("POST /v1/completions");
  }
  let payload;
  try {
    const raw2 = await c.req.text();
    if (!raw2) {
      payload = {};
    } else {
      payload = JSON.parse(raw2);
    }
  } catch {
    return c.json({ error: { message: "Invalid JSON body" } }, 400);
  }
  const model = normalizeModelName(payload.model, debugModel, c.env.OPENAI_DEFAULT_MODEL);
  let prompt = payload.prompt;
  if (Array.isArray(prompt)) {
    prompt = prompt.join("");
  }
  if (typeof prompt !== "string") {
    prompt = payload.suffix || "";
  }
  const streamReq = Boolean(payload.stream);
  const messages = [{ role: "user", content: String(prompt || "") }];
  const inputItems = convertChatMessagesToResponsesInput(messages);
  const reasoningOverrides = typeof payload.reasoning === "object" && payload.reasoning !== null ? payload.reasoning : void 0;
  const reasoningParam = buildReasoningParam(reasoningEffort, reasoningSummary, reasoningOverrides);
  const instructions = await getInstructionsForModel(model);
  const promptCacheKey = await resolvePromptCacheKey(payload, c.req.raw.headers, instructions);
  const { response: upstream, error: errorResp } = await startUpstreamRequest(c.env, model, inputItems, {
    instructions,
    reasoningParam,
    promptCacheKey
  });
  if (errorResp) {
    if (verbose) {
      console.log("Upstream error response");
    }
    return errorResp;
  }
  if (!upstream) {
    if (verbose) {
      console.log("No upstream response received");
    }
    return c.json({ error: { message: "Upstream request failed unexpectedly." } }, 500);
  }
  if (verbose) {
    console.log(`Upstream response: ${upstream.status}`);
  }
  const created = Math.floor(Date.now() / 1e3);
  if (streamReq) {
    return new Response(await sseTranslateText(upstream, model, created, verbose), {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...c.res.headers
      }
    });
  } else {
    let fullText = "";
    let responseId = "cmpl";
    try {
      const reader = upstream.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring("data: ".length).trim();
              if (!data || data === "[DONE]") {
                if (data === "[DONE]") {
                }
                continue;
              }
              try {
                const evt = JSON.parse(data);
                if (evt.response && typeof evt.response.id === "string") {
                  responseId = evt.response.id || responseId;
                }
                const kind = evt.type;
                if (kind === "response.output_text.delta") {
                  fullText += evt.delta || "";
                } else if (kind === "response.completed") {
                  break;
                }
              } catch (parseError) {
                console.error("Error parsing non-streamed SSE data:", parseError);
              }
            }
          }
        }
      }
    } catch (streamError) {
      console.error("Error reading non-streamed upstream response:", streamError);
      return c.json({ error: { message: `Error reading upstream response: ${streamError}` } }, 502);
    }
    const completion = {
      id: responseId || "cmpl",
      object: "text_completion",
      created,
      model,
      choices: [{ index: 0, text: fullText, finish_reason: "stop", logprobs: null }]
    };
    return new Response(JSON.stringify(completion), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        ...c.res.headers
      }
    });
  }
});
openai.get("/v1/models", openaiAuthMiddleware(), (c) => {
  const models = {
    object: "list",
    data: [
      ...MODEL_IDS.map((id) => ({ id, object: "model", owned_by: "owner" })),
      ...MODEL_PRESETS.map((preset) => ({
        id: preset.id,
        object: "model",
        owned_by: "owner",
        description: preset.description,
        reasoning_effort: preset.effort
      }))
    ]
  };
  return c.json(models);
});
openai.get("/v1/model-presets", openaiAuthMiddleware(), (c) => {
  return c.json({
    object: "list",
    data: MODEL_PRESETS
  });
});
var openai_default = openai;

// src/routes/ollama.ts
var ollama = new Hono2();
ollama.use(
  "*",
  openaiAuthMiddleware(),
  async (c) => c.json({ error: { message: "Ollama/local backend is disabled" } }, 410)
);
var ollama_default = ollama;

// src/model_mapping.ts
function configuredModelMap(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry) => typeof entry[1] === "string" && !!entry[1].trim()
      )
    );
  } catch {
    return {};
  }
}
__name(configuredModelMap, "configuredModelMap");
function mapModelId(osModelId, env2) {
  const requested = typeof osModelId === "string" ? osModelId.trim() : "";
  const mapped = configuredModelMap(env2.MODEL_ID_MAP)[requested];
  return normalizeModelName(mapped || requested, env2.DEBUG_MODEL, env2.OPENAI_DEFAULT_MODEL);
}
__name(mapModelId, "mapModelId");
function isKnownModelId(model, env2) {
  const known = /* @__PURE__ */ new Set([...MODEL_IDS, ...MODEL_PRESETS.map((preset) => preset.model), "codex-mini-latest"]);
  return known.has(model) || Object.values(configuredModelMap(env2.MODEL_ID_MAP)).some(
    (mapped) => normalizeModelName(mapped, env2.DEBUG_MODEL) === model
  );
}
__name(isKnownModelId, "isKnownModelId");
function isPrivateOriginModel(model) {
  return model === "gpt-5.6-luna" || model === "gpt-5.6-terra" || model === "gpt-5.6-sol";
}
__name(isPrivateOriginModel, "isPrivateOriginModel");

// src/routes/responses.ts
var responses = new Hono2();
function responseError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(responseError, "responseError");
async function responseJson(upstream, model, upstreamIsSse) {
  const contentType = upstream.headers.get("content-type") || "";
  if (!upstreamIsSse && !contentType.includes("text/event-stream")) {
    try {
      const body = await upstream.json();
      const safeBody = sanitizeTerminalResponse(body);
      return new Response(JSON.stringify({ ...safeBody, model: safeBody.model || model }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch {
      return responseError("Upstream request failed", 502);
    }
  }
  const reader = upstream.body?.getReader();
  if (!reader) return responseError("Upstream request failed", 502);
  let terminalResponse;
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer) buffer += "\n";
      }
      if (value) buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          const terminal = event.response && typeof event.response === "object" ? event.response : event;
          if ((/^response\.(completed|incomplete|cancelled|failed)$/.test(event.type) || /^response\.(completed|incomplete|cancelled|failed)$/.test(eventName)) && terminal && typeof terminal === "object") {
            terminalResponse = terminal;
          }
          eventName = "";
        } catch {
        }
      }
      if (done) break;
    }
  } catch {
    return responseError("Upstream request failed", 502);
  } finally {
    reader.releaseLock();
  }
  if (!terminalResponse) return responseError("Upstream request failed", 502);
  const response = sanitizeTerminalResponse(terminalResponse);
  return new Response(JSON.stringify({ ...response, model: response.model || model }), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(responseJson, "responseJson");
function sanitizeTerminalResponse(response) {
  return sanitizeEventData(response);
}
__name(sanitizeTerminalResponse, "sanitizeTerminalResponse");
responses.post("/v1/responses", openaiAuthMiddleware(), async (c) => {
  let payload;
  try {
    payload = await c.req.json();
  } catch {
    return responseError("Invalid JSON body", 400);
  }
  const input = payload.input;
  const inputItems = typeof input === "string" ? [{ type: "message", role: "user", content: input }] : [];
  if (Array.isArray(input)) inputItems.push(...input);
  if (!inputItems.length) return responseError("Request must include input", 400);
  const model = mapModelId(payload.model, c.env);
  if (c.env.UPSTREAM_MODE === "private-origin" && !isPrivateOriginModel(model)) {
    return responseError("Unsupported private-origin model", 400);
  }
  if (!isKnownModelId(model, c.env)) return responseError("Unknown model", 400);
  const instructions = typeof payload.instructions === "string" ? payload.instructions : await getInstructionsForModel(model);
  const promptCacheKey = await resolvePromptCacheKey(payload, c.req.raw.headers, instructions);
  const reasoning = typeof payload.reasoning === "object" && payload.reasoning !== null ? payload.reasoning : void 0;
  if (reasoning && Object.prototype.hasOwnProperty.call(reasoning, "effort")) {
    if (typeof reasoning.effort !== "string" || !isValidReasoningEffort(reasoning.effort)) {
      return responseError("Invalid reasoning effort", 400);
    }
  }
  const { response: upstream, error: error3, alreadySse } = await startUpstreamRequest(c.env, model, inputItems, {
    instructions,
    tools: Array.isArray(payload.tools) ? payload.tools : [],
    toolChoice: payload.tool_choice,
    parallelToolCalls: Boolean(payload.parallel_tool_calls),
    reasoningParam: buildReasoningParam(
      c.env.REASONING_EFFORT || "medium",
      c.env.REASONING_SUMMARY || "auto",
      reasoning
    ),
    promptCacheKey,
    responsesPayload: payload,
    rawResponsesBody: JSON.stringify(payload),
    signal: c.req.raw.signal
  });
  if (error3) return responseError("Upstream request failed", error3.status || 502);
  if (!upstream) return responseError("Upstream request failed", 502);
  if (payload.stream) {
    return new Response(alreadySse ? upstream.body : await sseTranslateResponses(upstream), {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...c.res.headers
      }
    });
  }
  return responseJson(upstream, model, false);
});
var responses_default = responses;

// src/oauth_login.ts
var OAUTH_CALLBACK_URI = "http://localhost:1455/auth/callback";
var AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
var TOKEN_URL = "https://auth.openai.com/oauth/token";
var STATE_TTL_SECONDS = 600;
function bytes(length) {
  const output = new Uint8Array(length);
  crypto.getRandomValues(output);
  return output;
}
__name(bytes, "bytes");
function base64Url(value) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64Url, "base64Url");
async function challenge(verifier) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}
__name(challenge, "challenge");
function tokenFromRequest(request) {
  const value = request.headers.get("Authorization");
  return value?.startsWith("Bearer ") && value.length > 7 ? value.slice(7) : null;
}
__name(tokenFromRequest, "tokenFromRequest");
async function authorized(c, options) {
  const token = tokenFromRequest(c.req.raw);
  if (!token) return false;
  if (options.verifyGatewayToken) return Boolean(await options.verifyGatewayToken(token, c.env));
  return Boolean(c.env.GATEWAY_BEARER_TOKEN && token === c.env.GATEWAY_BEARER_TOKEN);
}
__name(authorized, "authorized");
async function requestFields(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const value = body.callback_url ?? body.url;
      return { callbackUrl: typeof value === "string" ? value : null, auth: body.auth };
    } catch {
      return { callbackUrl: null };
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const params = new URLSearchParams(body);
    return { callbackUrl: params.get("callback_url") || params.get("url") };
  }
  return { callbackUrl: null };
}
__name(requestFields, "requestFields");
function callbackParams(raw2) {
  try {
    const url = new URL(raw2);
    if (url.protocol !== "http:" || url.hostname !== "localhost" || url.port !== "1455" || url.pathname !== "/auth/callback" || url.username || url.password || url.hash)
      return null;
    const allowed = /* @__PURE__ */ new Set(["code", "state", "error", "error_description", "error_uri"]);
    const seen = /* @__PURE__ */ new Set();
    for (const key of url.searchParams.keys()) {
      if (!allowed.has(key) || seen.has(key)) return null;
      seen.add(key);
    }
    return url.searchParams;
  } catch {
    return null;
  }
}
__name(callbackParams, "callbackParams");
function createOAuthLoginApp(options = {}) {
  const app2 = new Hono2();
  const now = options.now || Date.now;
  const random = options.random || bytes;
  const fetcher = options.fetch || fetch;
  const ttl = options.stateTtlSeconds || STATE_TTL_SECONDS;
  app2.get("/oauth/login/url", async (c) => {
    if (!await authorized(c, options)) return c.json({ error: "unauthorized" }, 401);
    if (!c.env.OAUTH_LOGIN_COORDINATOR) return c.json({ error: "oauth_unavailable" }, 503);
    const state = base64Url(random(32));
    const verifier = base64Url(random(32));
    const stateStub = c.env.OAUTH_LOGIN_COORDINATOR.get(c.env.OAUTH_LOGIN_COORDINATOR.idFromName(`oauth:${state}`));
    const stored = await stateStub.fetch("https://oauth-login.internal/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "create", verifier, createdAt: now(), ttlSeconds: ttl })
    });
    if (!stored.ok) return c.json({ error: "oauth_unavailable" }, 503);
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: c.env.CHATGPT_LOCAL_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
      redirect_uri: OAUTH_CALLBACK_URI,
      response_type: "code",
      scope: "openid profile email",
      state,
      code_challenge: await challenge(verifier),
      code_challenge_method: "S256"
    }).toString();
    return c.json({ authorization_url: url.toString() });
  });
  app2.post("/oauth/callback", async (c) => {
    if (!await authorized(c, options)) return c.json({ error: "unauthorized" }, 401);
    const { callbackUrl } = await requestFields(c.req.raw);
    const params = callbackUrl ? callbackParams(callbackUrl) : null;
    const state = params?.get("state");
    const code = params?.get("code");
    if (!params || !state || !code && !params.get("error")) return c.json({ error: "invalid_callback" }, 400);
    if (!c.env.OAUTH_LOGIN_COORDINATOR) return c.json({ error: "oauth_unavailable" }, 503);
    const stateStub = c.env.OAUTH_LOGIN_COORDINATOR.get(c.env.OAUTH_LOGIN_COORDINATOR.idFromName(`oauth:${state}`));
    const claimed = await stateStub.fetch("https://oauth-login.internal/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "claim" })
    });
    if (!claimed.ok) return c.json({ error: "invalid_state" }, 400);
    const record = await claimed.json();
    if (!code) return c.json({ error: "authorization_denied" }, 400);
    const response = await fetcher(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: c.env.CHATGPT_LOCAL_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
        grant_type: "authorization_code",
        code,
        redirect_uri: OAUTH_CALLBACK_URI,
        code_verifier: record.verifier
      })
    });
    if (!response.ok) return c.json({ error: "oauth_exchange_failed" }, 502);
    const exchanged = await response.json();
    if (typeof exchanged.access_token !== "string" || !exchanged.access_token)
      return c.json({ error: "oauth_exchange_failed" }, 502);
    const tokens = { access_token: exchanged.access_token };
    if (typeof exchanged.refresh_token === "string") tokens.refresh_token = exchanged.refresh_token;
    if (typeof exchanged.id_token === "string") tokens.id_token = exchanged.id_token;
    const expiresAt = typeof exchanged.expires_in === "number" && exchanged.expires_in > 0 ? new Date(now() + exchanged.expires_in * 1e3).toISOString() : null;
    await projectToKv(c.env, { tokens, lastRefresh: new Date(now()).toISOString(), expiresAt }, now());
    return c.json({ status: "ok" });
  });
  app2.post("/oauth/bootstrap", async (c) => {
    if (!await authorized(c, options)) return c.json({ error: "unauthorized" }, 401);
    if (c.env.OAUTH_BOOTSTRAP_ENABLED !== "true") return c.json({ error: "oauth_disabled" }, 410);
    if (!c.env.OAUTH_VAULT || !c.env.OAUTH_VAULT_KEY) return c.json({ error: "oauth_unavailable" }, 503);
    if (await vaultGet(c.env)) return c.json({ error: "bootstrap_already_complete" }, 409);
    let input;
    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: "invalid_request" }, 400);
    }
    const tokens = input?.auth?.tokens;
    if (!tokens || typeof tokens.access_token !== "string" || !tokens.access_token || tokens.refresh_token !== void 0 && typeof tokens.refresh_token !== "string" || tokens.id_token !== void 0 && typeof tokens.id_token !== "string" || tokens.account_id !== void 0 && typeof tokens.account_id !== "string")
      return c.json({ error: "invalid_request" }, 400);
    await projectToKv(c.env, { tokens, lastRefresh: (/* @__PURE__ */ new Date()).toISOString(), expiresAt: null }, Date.now());
    return c.json({ status: "ok" });
  });
  return app2;
}
__name(createOAuthLoginApp, "createOAuthLoginApp");

// src/oauth_login_page.ts
function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character] ?? character
  );
}
__name(escapeHtml, "escapeHtml");
function createOAuthLoginPage(options) {
  const app2 = new Hono2();
  const callbackEndpoint = escapeHtml(options.callbackEndpoint);
  app2.get(
    "/",
    (c) => c.html(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OAuth login</title></head>
<body>
<main>
<h1>OAuth login</h1>
<form id="oauth-form">
<label for="token">Gateway token</label>
<input id="token" name="token" type="password" autocomplete="off" required>
<label for="callback-url">Callback URL</label>
<textarea id="callback-url" name="callback_url" required></textarea>
<button type="submit">Complete login</button>
</form>
<p id="status" role="status" aria-live="polite"></p>
<script>
const form = document.getElementById("oauth-form");
const status = document.getElementById("status");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const tokenField = document.getElementById("token");
  const callbackField = document.getElementById("callback-url");
  const token = tokenField.value;
  const callbackUrl = callbackField.value;
  status.textContent = "Submitting\u2026";
  try {
    const response = await fetch("${callbackEndpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ callback_url: callbackUrl })
    });
    if (!response.ok) throw new Error("request failed");
    status.textContent = "OAuth login completed.";
    form.reset();
  } catch {
    status.textContent = "Unable to complete OAuth callback.";
  }
});
<\/script>
</main>
</body>
</html>`)
  );
  return app2;
}
__name(createOAuthLoginPage, "createOAuthLoginPage");

// src/auth_refresh_coordinator.ts
var CREDENTIAL_KEY = "credential";
var OPERATION_STRENGTH2 = { get: 0, fresh: 1, refresh: 2 };
var AuthRefreshCoordinator = class {
  constructor(state, env2) {
    this.state = state;
    this.env = env2;
  }
  state;
  env;
  static {
    __name(this, "AuthRefreshCoordinator");
  }
  refreshInFlight = null;
  async fetch(request) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    if (this.env.GATEWAY_BEARER_TOKEN && request.headers.get("X-Internal-Auth") !== this.env.GATEWAY_BEARER_TOKEN)
      return new Response("Forbidden", { status: 403 });
    const input = await request.json();
    try {
      const record = await this.coordinate(input);
      return Response.json({ ...record, ...record.auth, ...record.auth.tokens });
    } catch (error3) {
      if (error3 instanceof Error && error3.message === "reauthorization_required")
        return Response.json({ error: "reauthorization_required" }, { status: 401 });
      throw error3;
    }
  }
  async coordinate(input) {
    const operation = input.operation || (input.force ? "refresh" : "fresh");
    const active = this.refreshInFlight;
    if (active) {
      if (OPERATION_STRENGTH2[operation] <= OPERATION_STRENGTH2[active.operation]) return active.promise;
      await active.promise;
      return this.coordinate(input);
    }
    const promise = this.state.blockConcurrencyWhile(async () => {
      input.source ||= await loadBootstrap(this.env, input.now);
      let current = await this.state.storage.get(CREDENTIAL_KEY);
      if (!current) {
        current = { generation: 1, fingerprint: authFingerprint(input.source), auth: input.source };
        await this.state.storage.put(CREDENTIAL_KEY, current);
      }
      if (input.observedGeneration !== void 0 && input.observedGeneration !== current.generation) return current;
      if (input.operation === "get" || !input.force && !needsRefresh(current.auth, input.now)) return current;
      const generation = current.generation;
      const account = current.auth.tokens.account_id ? `account:${current.auth.tokens.account_id}` : "account:unknown";
      let updated;
      try {
        updated = await requestRefresh(this.env, current.auth, input.now, account);
      } catch (error3) {
        if (error3 instanceof Error && error3.message === "reauthorization_required") throw error3;
        return current;
      }
      if (!updated) return current;
      const latest = await this.state.storage.get(CREDENTIAL_KEY);
      if (!latest || latest.generation !== generation) return latest || current;
      const committed = { generation: generation + 1, fingerprint: authFingerprint(updated), auth: updated };
      await this.state.storage.put(CREDENTIAL_KEY, committed);
      await projectToKv(this.env, updated, input.now);
      return committed;
    });
    const inFlight = { operation, promise };
    this.refreshInFlight = inFlight;
    try {
      return await promise;
    } catch (error3) {
      if (error3 instanceof Error && error3.message === "reauthorization_required") throw error3;
      throw error3;
    } finally {
      if (this.refreshInFlight === inFlight) this.refreshInFlight = null;
    }
  }
};

// src/oauth_login_coordinator.ts
var OAuthLoginCoordinator = class {
  constructor(state) {
    this.state = state;
  }
  state;
  static {
    __name(this, "OAuthLoginCoordinator");
  }
  async fetch(request) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const input = await request.json();
    if (input.operation === "create" && typeof input.verifier === "string" && typeof input.createdAt === "number") {
      const expiresAt = input.createdAt + (input.ttlSeconds || 600) * 1e3;
      await this.state.storage.put("state", {
        verifier: input.verifier,
        createdAt: input.createdAt,
        expiresAt
      });
      await this.state.storage.setAlarm(expiresAt);
      return new Response(null, { status: 204 });
    }
    if (input.operation !== "claim") return new Response(null, { status: 400 });
    const record = await this.state.storage.transaction(async (transaction) => {
      const value = await transaction.get("state");
      if (value && value.expiresAt > Date.now()) await transaction.delete("state");
      if (value && value.expiresAt <= Date.now()) return void 0;
      return value;
    });
    return record ? Response.json(record) : new Response(null, { status: 404 });
  }
  async alarm() {
    await this.state.storage.delete("state");
  }
};

// src/index.ts
var app = new Hono2();
app.use(
  "*",
  cors({
    origin: "*",
    // Or specify allowed origins
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "OpenAI-Beta",
      "chatgpt-account-id",
      "Prompt-Cache-Key",
      "X-Prompt-Cache-Key",
      "Conversation-Id",
      "X-Conversation-Id",
      "Session-Id",
      "X-Session-Id",
      "Request-Id",
      "X-Request-Id"
    ],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true
  })
);
app.get("/", (c) => c.json({ status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok" }));
app.use("/oauth/*", async (c, next) => {
  if (c.env.OPENAI_PROVIDER === "chatgpt-oauth") {
    if (c.req.path === "/oauth/bootstrap") {
      if (c.env.OAUTH_BOOTSTRAP_ENABLED === "true") return next();
      return c.json({ error: "oauth_disabled" }, 410);
    }
    if (["/oauth/login", "/oauth/login/url", "/oauth/callback"].includes(c.req.path)) return next();
  }
  return c.json({ error: "oauth_disabled" }, 410);
});
app.route("/oauth/login", createOAuthLoginPage({ callbackEndpoint: "/oauth/callback" }));
app.route("/", createOAuthLoginApp());
app.route("/", openai_default);
app.route("/", responses_default);
app.route("/api", ollama_default);
var index_default = app;
export {
  AuthRefreshCoordinator,
  OAuthLoginCoordinator,
  OAuthVault,
  index_default as default
};
//# sourceMappingURL=index.js.map
