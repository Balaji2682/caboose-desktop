export namespace config {
	
	export class DatabaseConnection {
	    Name: string;
	    Driver: string;
	    Host: string;
	    Port: number;
	    User: string;
	    Database: string;
	    SSLMode: string;
	
	    static createFrom(source: any = {}) {
	        return new DatabaseConnection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Name = source["Name"];
	        this.Driver = source["Driver"];
	        this.Host = source["Host"];
	        this.Port = source["Port"];
	        this.User = source["User"];
	        this.Database = source["Database"];
	        this.SSLMode = source["SSLMode"];
	    }
	}

}

export namespace database {
	
	export class ColumnInfo {
	    name: string;
	    dataType: string;
	    isNullable: boolean;
	    isPrimaryKey: boolean;
	    default?: string;
	    comment?: string;
	    maxLength?: number;
	
	    static createFrom(source: any = {}) {
	        return new ColumnInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.dataType = source["dataType"];
	        this.isNullable = source["isNullable"];
	        this.isPrimaryKey = source["isPrimaryKey"];
	        this.default = source["default"];
	        this.comment = source["comment"];
	        this.maxLength = source["maxLength"];
	    }
	}
	export class ConnectionMetrics {
	    active: number;
	    max: number;
	    idle: number;
	    utilization: number;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.active = source["active"];
	        this.max = source["max"];
	        this.idle = source["idle"];
	        this.utilization = source["utilization"];
	    }
	}
	export class TableStatistic {
	    name: string;
	    rows: number;
	    size: number;
	    indexCount: number;
	    bloat: number;
	    sizeFormatted: string;
	
	    static createFrom(source: any = {}) {
	        return new TableStatistic(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.rows = source["rows"];
	        this.size = source["size"];
	        this.indexCount = source["indexCount"];
	        this.bloat = source["bloat"];
	        this.sizeFormatted = source["sizeFormatted"];
	    }
	}
	export class SlowQuery {
	    query: string;
	    time: number;
	    count: number;
	    fingerprint: string;
	
	    static createFrom(source: any = {}) {
	        return new SlowQuery(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.time = source["time"];
	        this.count = source["count"];
	        this.fingerprint = source["fingerprint"];
	    }
	}
	export class HealthIssue {
	    id: string;
	    type: string;
	    severity: string;
	    title: string;
	    description: string;
	    table?: string;
	    impact: string;
	    recommendation?: string;
	
	    static createFrom(source: any = {}) {
	        return new HealthIssue(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.severity = source["severity"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.table = source["table"];
	        this.impact = source["impact"];
	        this.recommendation = source["recommendation"];
	    }
	}
	export class PerformanceMetrics {
	    cacheHitRate: number;
	    transactionsPerSecond: number;
	    avgQueryTime: number;
	    slowQueryCount: number;
	
	    static createFrom(source: any = {}) {
	        return new PerformanceMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cacheHitRate = source["cacheHitRate"];
	        this.transactionsPerSecond = source["transactionsPerSecond"];
	        this.avgQueryTime = source["avgQueryTime"];
	        this.slowQueryCount = source["slowQueryCount"];
	    }
	}
	export class DatabaseHealth {
	    score: number;
	    status: string;
	    connections: ConnectionMetrics;
	    performance: PerformanceMetrics;
	    issues: HealthIssue[];
	    slowQueries: SlowQuery[];
	    tableStats: TableStatistic[];
	    lastChecked: string;
	
	    static createFrom(source: any = {}) {
	        return new DatabaseHealth(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.score = source["score"];
	        this.status = source["status"];
	        this.connections = this.convertValues(source["connections"], ConnectionMetrics);
	        this.performance = this.convertValues(source["performance"], PerformanceMetrics);
	        this.issues = this.convertValues(source["issues"], HealthIssue);
	        this.slowQueries = this.convertValues(source["slowQueries"], SlowQuery);
	        this.tableStats = this.convertValues(source["tableStats"], TableStatistic);
	        this.lastChecked = source["lastChecked"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DatabaseStatus {
	    connected: boolean;
	    driver?: string;
	    database?: string;
	    host?: string;
	    version?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new DatabaseStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connected = source["connected"];
	        this.driver = source["driver"];
	        this.database = source["database"];
	        this.host = source["host"];
	        this.version = source["version"];
	        this.error = source["error"];
	    }
	}
	export class ExplainAnalysis {
	    hasTableScan: boolean;
	    hasIndexScan: boolean;
	    rowsExamined: number;
	    usingTemporary: boolean;
	    usingFilesort: boolean;
	    summary: string;
	    performanceScore: number;
	
	    static createFrom(source: any = {}) {
	        return new ExplainAnalysis(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hasTableScan = source["hasTableScan"];
	        this.hasIndexScan = source["hasIndexScan"];
	        this.rowsExamined = source["rowsExamined"];
	        this.usingTemporary = source["usingTemporary"];
	        this.usingFilesort = source["usingFilesort"];
	        this.summary = source["summary"];
	        this.performanceScore = source["performanceScore"];
	    }
	}
	export class IndexRecommendation {
	    table: string;
	    columns: string[];
	    reason: string;
	    severity: string;
	    sql: string;
	    estimatedImpact: string;
	
	    static createFrom(source: any = {}) {
	        return new IndexRecommendation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.table = source["table"];
	        this.columns = source["columns"];
	        this.reason = source["reason"];
	        this.severity = source["severity"];
	        this.sql = source["sql"];
	        this.estimatedImpact = source["estimatedImpact"];
	    }
	}
	export class ExplainResult {
	    rows: any[];
	    columns: string[];
	    query: string;
	    executionTime: number;
	    recommendations: IndexRecommendation[];
	    analysis: ExplainAnalysis;
	
	    static createFrom(source: any = {}) {
	        return new ExplainResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rows = source["rows"];
	        this.columns = source["columns"];
	        this.query = source["query"];
	        this.executionTime = source["executionTime"];
	        this.recommendations = this.convertValues(source["recommendations"], IndexRecommendation);
	        this.analysis = this.convertValues(source["analysis"], ExplainAnalysis);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	export class QueryResult {
	    columns: string[];
	    columnTypes: string[];
	    rows: any[];
	    rowCount: number;
	    affectedRows: number;
	    executionTime: number;
	    error?: string;
	    isSelect: boolean;
	
	    static createFrom(source: any = {}) {
	        return new QueryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.columns = source["columns"];
	        this.columnTypes = source["columnTypes"];
	        this.rows = source["rows"];
	        this.rowCount = source["rowCount"];
	        this.affectedRows = source["affectedRows"];
	        this.executionTime = source["executionTime"];
	        this.error = source["error"];
	        this.isSelect = source["isSelect"];
	    }
	}
	export class QueryStatistic {
	    id: string;
	    fingerprint: string;
	    sql: string;
	    count: number;
	    avgTime: number;
	    totalTime: number;
	    lastExecuted: string;
	    issue?: string;
	
	    static createFrom(source: any = {}) {
	        return new QueryStatistic(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fingerprint = source["fingerprint"];
	        this.sql = source["sql"];
	        this.count = source["count"];
	        this.avgTime = source["avgTime"];
	        this.totalTime = source["totalTime"];
	        this.lastExecuted = source["lastExecuted"];
	        this.issue = source["issue"];
	    }
	}
	export class SavedQuery {
	    id: string;
	    name: string;
	    sql: string;
	    createdAt: string;
	    lastUsedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new SavedQuery(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.sql = source["sql"];
	        this.createdAt = source["createdAt"];
	        this.lastUsedAt = source["lastUsedAt"];
	    }
	}
	
	export class TableInfo {
	    name: string;
	    schema?: string;
	    type: string;
	    rowCount?: number;
	    comment?: string;
	
	    static createFrom(source: any = {}) {
	        return new TableInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.schema = source["schema"];
	        this.type = source["type"];
	        this.rowCount = source["rowCount"];
	        this.comment = source["comment"];
	    }
	}

}

export namespace exceptions {
	
	export class Exception {
	    id: string;
	    type: string;
	    message: string;
	    severity: string;
	    count: number;
	    firstSeen: string;
	    lastSeen: string;
	    file: string;
	    line: number;
	    stackTrace: string[];
	    context?: Record<string, any>;
	    resolved: boolean;
	    ignored: boolean;
	    fingerprint: string;
	
	    static createFrom(source: any = {}) {
	        return new Exception(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.message = source["message"];
	        this.severity = source["severity"];
	        this.count = source["count"];
	        this.firstSeen = source["firstSeen"];
	        this.lastSeen = source["lastSeen"];
	        this.file = source["file"];
	        this.line = source["line"];
	        this.stackTrace = source["stackTrace"];
	        this.context = source["context"];
	        this.resolved = source["resolved"];
	        this.ignored = source["ignored"];
	        this.fingerprint = source["fingerprint"];
	    }
	}

}

export namespace main {
	
	export class LogEntry {
	    id: string;
	    process: string;
	    content: string;
	    level: string;
	    // Go type: time
	    timestamp: any;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.process = source["process"];
	        this.content = source["content"];
	        this.level = source["level"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProcessInfo {
	    id: string;
	    name: string;
	    type: string;
	    status: string;
	    port?: number;
	    command: string;
	    pid?: number;
	    uptime?: string;
	    cpu: number;
	    memory: number;
	    autoRestart: boolean;
	    color?: string;
	    // Go type: time
	    startedAt?: any;
	
	    static createFrom(source: any = {}) {
	        return new ProcessInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.status = source["status"];
	        this.port = source["port"];
	        this.command = source["command"];
	        this.pid = source["pid"];
	        this.uptime = source["uptime"];
	        this.cpu = source["cpu"];
	        this.memory = source["memory"];
	        this.autoRestart = source["autoRestart"];
	        this.color = source["color"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace metrics {
	
	export class EndpointMetric {
	    endpoint: string;
	    requests: number;
	    avgTime: number;
	    p95: number;
	    errors: number;
	
	    static createFrom(source: any = {}) {
	        return new EndpointMetric(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.endpoint = source["endpoint"];
	        this.requests = source["requests"];
	        this.avgTime = source["avgTime"];
	        this.p95 = source["p95"];
	        this.errors = source["errors"];
	    }
	}
	export class TimeSeriesPoint {
	    time: string;
	    cpu: number;
	    memory: number;
	    requests: number;
	    responseTime: number;
	    errors: number;
	
	    static createFrom(source: any = {}) {
	        return new TimeSeriesPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.time = source["time"];
	        this.cpu = source["cpu"];
	        this.memory = source["memory"];
	        this.requests = source["requests"];
	        this.responseTime = source["responseTime"];
	        this.errors = source["errors"];
	    }
	}
	export class RequestMetrics {
	    totalRequests: number;
	    requestRate: number;
	    avgResponseTime: number;
	    errorRate: number;
	    activeConnections: number;
	
	    static createFrom(source: any = {}) {
	        return new RequestMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalRequests = source["totalRequests"];
	        this.requestRate = source["requestRate"];
	        this.avgResponseTime = source["avgResponseTime"];
	        this.errorRate = source["errorRate"];
	        this.activeConnections = source["activeConnections"];
	    }
	}
	export class SystemMetrics {
	    cpu: number;
	    memory: number;
	    goroutines: number;
	    timestamp: string;
	    memoryAllocMB: number;
	    memorySysMB: number;
	    numGC: number;
	
	    static createFrom(source: any = {}) {
	        return new SystemMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpu = source["cpu"];
	        this.memory = source["memory"];
	        this.goroutines = source["goroutines"];
	        this.timestamp = source["timestamp"];
	        this.memoryAllocMB = source["memoryAllocMB"];
	        this.memorySysMB = source["memorySysMB"];
	        this.numGC = source["numGC"];
	    }
	}
	export class Metrics {
	    system: SystemMetrics;
	    requests: RequestMetrics;
	    timeSeries: TimeSeriesPoint[];
	    topEndpoints: EndpointMetric[];
	    lastUpdated: string;
	
	    static createFrom(source: any = {}) {
	        return new Metrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.system = this.convertValues(source["system"], SystemMetrics);
	        this.requests = this.convertValues(source["requests"], RequestMetrics);
	        this.timeSeries = this.convertValues(source["timeSeries"], TimeSeriesPoint);
	        this.topEndpoints = this.convertValues(source["topEndpoints"], EndpointMetric);
	        this.lastUpdated = source["lastUpdated"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	

}

export namespace models {
	
	export class StackFrame {
	    file: string;
	    line: number;
	    function: string;
	    context?: string;
	
	    static createFrom(source: any = {}) {
	        return new StackFrame(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.file = source["file"];
	        this.line = source["line"];
	        this.function = source["function"];
	        this.context = source["context"];
	    }
	}
	export class ExceptionLog {
	    type: string;
	    message: string;
	    backtrace?: StackFrame[];
	    // Go type: time
	    firstSeen: any;
	    // Go type: time
	    lastSeen: any;
	    count: number;
	    fingerprint: string;
	
	    static createFrom(source: any = {}) {
	        return new ExceptionLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.message = source["message"];
	        this.backtrace = this.convertValues(source["backtrace"], StackFrame);
	        this.firstSeen = this.convertValues(source["firstSeen"], null);
	        this.lastSeen = this.convertValues(source["lastSeen"], null);
	        this.count = source["count"];
	        this.fingerprint = source["fingerprint"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GitBlameLine {
	    lineNumber: number;
	    content: string;
	    commitHash: string;
	    author: string;
	    authorEmail: string;
	    // Go type: time
	    authorDate: any;
	    commitMessage: string;
	    commitSummary: string;
	
	    static createFrom(source: any = {}) {
	        return new GitBlameLine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.lineNumber = source["lineNumber"];
	        this.content = source["content"];
	        this.commitHash = source["commitHash"];
	        this.author = source["author"];
	        this.authorEmail = source["authorEmail"];
	        this.authorDate = this.convertValues(source["authorDate"], null);
	        this.commitMessage = source["commitMessage"];
	        this.commitSummary = source["commitSummary"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GitBlameFile {
	    filePath: string;
	    lines: GitBlameLine[];
	
	    static createFrom(source: any = {}) {
	        return new GitBlameFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.lines = this.convertValues(source["lines"], GitBlameLine);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class GitBranch {
	    name: string;
	    current: boolean;
	    remote?: string;
	    upstream?: string;
	    commitHash: string;
	
	    static createFrom(source: any = {}) {
	        return new GitBranch(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.current = source["current"];
	        this.remote = source["remote"];
	        this.upstream = source["upstream"];
	        this.commitHash = source["commitHash"];
	    }
	}
	export class GitCommit {
	    hash: string;
	    shortHash: string;
	    author: string;
	    authorEmail: string;
	    // Go type: time
	    authorDate: any;
	    committer: string;
	    committerEmail: string;
	    // Go type: time
	    committerDate: any;
	    message: string;
	    summary: string;
	    parents: string[];
	    files?: string[];
	
	    static createFrom(source: any = {}) {
	        return new GitCommit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hash = source["hash"];
	        this.shortHash = source["shortHash"];
	        this.author = source["author"];
	        this.authorEmail = source["authorEmail"];
	        this.authorDate = this.convertValues(source["authorDate"], null);
	        this.committer = source["committer"];
	        this.committerEmail = source["committerEmail"];
	        this.committerDate = this.convertValues(source["committerDate"], null);
	        this.message = source["message"];
	        this.summary = source["summary"];
	        this.parents = source["parents"];
	        this.files = source["files"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GitCommitOptions {
	    message: string;
	    files?: string[];
	    amend: boolean;
	    author?: string;
	
	    static createFrom(source: any = {}) {
	        return new GitCommitOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.message = source["message"];
	        this.files = source["files"];
	        this.amend = source["amend"];
	        this.author = source["author"];
	    }
	}
	export class GitConflictRegion {
	    startLine: number;
	    endLine: number;
	    oursLines: string[];
	    theirsLines: string[];
	    baseLines?: string[];
	
	    static createFrom(source: any = {}) {
	        return new GitConflictRegion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startLine = source["startLine"];
	        this.endLine = source["endLine"];
	        this.oursLines = source["oursLines"];
	        this.theirsLines = source["theirsLines"];
	        this.baseLines = source["baseLines"];
	    }
	}
	export class GitConflictFile {
	    path: string;
	    oursContent: string;
	    theirsContent: string;
	    baseContent: string;
	    conflictRegions: GitConflictRegion[];
	
	    static createFrom(source: any = {}) {
	        return new GitConflictFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.oursContent = source["oursContent"];
	        this.theirsContent = source["theirsContent"];
	        this.baseContent = source["baseContent"];
	        this.conflictRegions = this.convertValues(source["conflictRegions"], GitConflictRegion);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class GitDiffHunk {
	    oldStart: number;
	    oldLines: number;
	    newStart: number;
	    newLines: number;
	    header: string;
	    lines: string[];
	
	    static createFrom(source: any = {}) {
	        return new GitDiffHunk(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.oldStart = source["oldStart"];
	        this.oldLines = source["oldLines"];
	        this.newStart = source["newStart"];
	        this.newLines = source["newLines"];
	        this.header = source["header"];
	        this.lines = source["lines"];
	    }
	}
	export class GitDiff {
	    filePath: string;
	    oldPath?: string;
	    status: string;
	    oldMode?: string;
	    newMode?: string;
	    hunks: GitDiffHunk[];
	    isBinary: boolean;
	    oldSha?: string;
	    newSha?: string;
	
	    static createFrom(source: any = {}) {
	        return new GitDiff(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.oldPath = source["oldPath"];
	        this.status = source["status"];
	        this.oldMode = source["oldMode"];
	        this.newMode = source["newMode"];
	        this.hunks = this.convertValues(source["hunks"], GitDiffHunk);
	        this.isBinary = source["isBinary"];
	        this.oldSha = source["oldSha"];
	        this.newSha = source["newSha"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class GitDiffOptions {
	    filePath?: string;
	    staged: boolean;
	    cached: boolean;
	    ref?: string;
	    refA?: string;
	    refB?: string;
	    context: number;
	
	    static createFrom(source: any = {}) {
	        return new GitDiffOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.staged = source["staged"];
	        this.cached = source["cached"];
	        this.ref = source["ref"];
	        this.refA = source["refA"];
	        this.refB = source["refB"];
	        this.context = source["context"];
	    }
	}
	export class GitFileStatus {
	    path: string;
	    status: string;
	    stagingStatus: string;
	    oldPath?: string;
	
	    static createFrom(source: any = {}) {
	        return new GitFileStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.status = source["status"];
	        this.stagingStatus = source["stagingStatus"];
	        this.oldPath = source["oldPath"];
	    }
	}
	export class GitLogOptions {
	    maxCount: number;
	    skip: number;
	    author?: string;
	    since?: string;
	    until?: string;
	    path?: string;
	    branch?: string;
	    allBranches: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GitLogOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.maxCount = source["maxCount"];
	        this.skip = source["skip"];
	        this.author = source["author"];
	        this.since = source["since"];
	        this.until = source["until"];
	        this.path = source["path"];
	        this.branch = source["branch"];
	        this.allBranches = source["allBranches"];
	    }
	}
	export class GitStatus {
	    currentBranch: string;
	    ahead: number;
	    behind: number;
	    files: GitFileStatus[];
	    hasConflicts: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GitStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentBranch = source["currentBranch"];
	        this.ahead = source["ahead"];
	        this.behind = source["behind"];
	        this.files = this.convertValues(source["files"], GitFileStatus);
	        this.hasConflicts = source["hasConflicts"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImpactEstimate {
	    queryTimeReduction: number;
	    queryCountReduction: number;
	    totalTimeSaved: number;
	    confidenceScore: number;
	
	    static createFrom(source: any = {}) {
	        return new ImpactEstimate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queryTimeReduction = source["queryTimeReduction"];
	        this.queryCountReduction = source["queryCountReduction"];
	        this.totalTimeSaved = source["totalTimeSaved"];
	        this.confidenceScore = source["confidenceScore"];
	    }
	}
	export class Improvement {
	    timeReduction: number;
	    rowsReduction: number;
	    scoreImprovement: number;
	
	    static createFrom(source: any = {}) {
	        return new Improvement(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeReduction = source["timeReduction"];
	        this.rowsReduction = source["rowsReduction"];
	        this.scoreImprovement = source["scoreImprovement"];
	    }
	}
	export class RequestLog {
	    method: string;
	    path: string;
	    controller?: string;
	    action?: string;
	    status?: number;
	    duration?: number;
	    ip?: string;
	    params?: any[];
	
	    static createFrom(source: any = {}) {
	        return new RequestLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.path = source["path"];
	        this.controller = source["controller"];
	        this.action = source["action"];
	        this.status = source["status"];
	        this.duration = source["duration"];
	        this.ip = source["ip"];
	        this.params = source["params"];
	    }
	}
	export class SQLLog {
	    query: string;
	    duration: number;
	    fingerprint: string;
	    table?: string;
	    operation?: string;
	
	    static createFrom(source: any = {}) {
	        return new SQLLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.duration = source["duration"];
	        this.fingerprint = source["fingerprint"];
	        this.table = source["table"];
	        this.operation = source["operation"];
	    }
	}
	export class LogEntry {
	    id: string;
	    // Go type: time
	    timestamp: any;
	    raw: string;
	    level: string;
	    message: string;
	    processName: string;
	    requestId?: string;
	    metadata?: Record<string, any>;
	    sql?: SQLLog;
	    request?: RequestLog;
	    exception?: ExceptionLog;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.raw = source["raw"];
	        this.level = source["level"];
	        this.message = source["message"];
	        this.processName = source["processName"];
	        this.requestId = source["requestId"];
	        this.metadata = source["metadata"];
	        this.sql = this.convertValues(source["sql"], SQLLog);
	        this.request = this.convertValues(source["request"], RequestLog);
	        this.exception = this.convertValues(source["exception"], ExceptionLog);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class N1Warning {
	    fingerprint: string;
	    table: string;
	    count: number;
	    totalDuration: number;
	    confidence: number;
	    suggestion: string;
	    examples?: string[];
	
	    static createFrom(source: any = {}) {
	        return new N1Warning(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.fingerprint = source["fingerprint"];
	        this.table = source["table"];
	        this.count = source["count"];
	        this.totalDuration = source["totalDuration"];
	        this.confidence = source["confidence"];
	        this.suggestion = source["suggestion"];
	        this.examples = source["examples"];
	    }
	}
	export class OperationDistribution {
	    operation: string;
	    count: number;
	    avgTime: number;
	    percentage: number;
	
	    static createFrom(source: any = {}) {
	        return new OperationDistribution(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.operation = source["operation"];
	        this.count = source["count"];
	        this.avgTime = source["avgTime"];
	        this.percentage = source["percentage"];
	    }
	}
	export class QueryExecution {
	    sql: string;
	    explainResult: any;
	    estimatedTime: number;
	    rowsExamined: number;
	    performanceScore: number;
	
	    static createFrom(source: any = {}) {
	        return new QueryExecution(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sql = source["sql"];
	        this.explainResult = source["explainResult"];
	        this.estimatedTime = source["estimatedTime"];
	        this.rowsExamined = source["rowsExamined"];
	        this.performanceScore = source["performanceScore"];
	    }
	}
	export class QueryComparison {
	    before: QueryExecution;
	    after: QueryExecution;
	    improvement: Improvement;
	
	    static createFrom(source: any = {}) {
	        return new QueryComparison(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.before = this.convertValues(source["before"], QueryExecution);
	        this.after = this.convertValues(source["after"], QueryExecution);
	        this.improvement = this.convertValues(source["improvement"], Improvement);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TableDistribution {
	    table: string;
	    queryCount: number;
	    avgTime: number;
	    totalTime: number;
	    issueCount: number;
	
	    static createFrom(source: any = {}) {
	        return new TableDistribution(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.table = source["table"];
	        this.queryCount = source["queryCount"];
	        this.avgTime = source["avgTime"];
	        this.totalTime = source["totalTime"];
	        this.issueCount = source["issueCount"];
	    }
	}
	export class QueryDistribution {
	    byTable: TableDistribution[];
	    byOperation: OperationDistribution[];
	
	    static createFrom(source: any = {}) {
	        return new QueryDistribution(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.byTable = this.convertValues(source["byTable"], TableDistribution);
	        this.byOperation = this.convertValues(source["byOperation"], OperationDistribution);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class QueryInfo {
	    sql: string;
	    fingerprint: string;
	    duration: number;
	    table: string;
	    operation: string;
	    count: number;
	    isSlow: boolean;
	    hasSelectStar: boolean;
	
	    static createFrom(source: any = {}) {
	        return new QueryInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sql = source["sql"];
	        this.fingerprint = source["fingerprint"];
	        this.duration = source["duration"];
	        this.table = source["table"];
	        this.operation = source["operation"];
	        this.count = source["count"];
	        this.isSlow = source["isSlow"];
	        this.hasSelectStar = source["hasSelectStar"];
	    }
	}
	export class RecommendationFix {
	    type: string;
	    code: string;
	    explanation: string;
	    railsModel?: string;
	    railsAssociation?: string;
	
	    static createFrom(source: any = {}) {
	        return new RecommendationFix(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.code = source["code"];
	        this.explanation = source["explanation"];
	        this.railsModel = source["railsModel"];
	        this.railsAssociation = source["railsAssociation"];
	    }
	}
	
	export class RequestQueryGroup {
	    requestId: string;
	    endpoint: string;
	    method: string;
	    timestamp: string;
	    totalQueries: number;
	    totalDuration: number;
	    queries: QueryInfo[];
	    n1Warnings: N1Warning[];
	    slowQueries: QueryInfo[];
	    duplicateCount: number;
	    healthScore: number;
	
	    static createFrom(source: any = {}) {
	        return new RequestQueryGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.requestId = source["requestId"];
	        this.endpoint = source["endpoint"];
	        this.method = source["method"];
	        this.timestamp = source["timestamp"];
	        this.totalQueries = source["totalQueries"];
	        this.totalDuration = source["totalDuration"];
	        this.queries = this.convertValues(source["queries"], QueryInfo);
	        this.n1Warnings = this.convertValues(source["n1Warnings"], N1Warning);
	        this.slowQueries = this.convertValues(source["slowQueries"], QueryInfo);
	        this.duplicateCount = source["duplicateCount"];
	        this.healthScore = source["healthScore"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SSHServer {
	    id: string;
	    name: string;
	    host: string;
	    port: number;
	    username: string;
	    authMethod: string;
	    privateKeyPath?: string;
	    useAgent: boolean;
	    tags?: string[];
	    environment?: Record<string, string>;
	    color?: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    lastConnected?: any;
	
	    static createFrom(source: any = {}) {
	        return new SSHServer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.username = source["username"];
	        this.authMethod = source["authMethod"];
	        this.privateKeyPath = source["privateKeyPath"];
	        this.useAgent = source["useAgent"];
	        this.tags = source["tags"];
	        this.environment = source["environment"];
	        this.color = source["color"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.lastConnected = this.convertValues(source["lastConnected"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SSHTunnel {
	    id: string;
	    type: string;
	    localHost: string;
	    localPort: number;
	    remoteHost: string;
	    remotePort: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new SSHTunnel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.localHost = source["localHost"];
	        this.localPort = source["localPort"];
	        this.remoteHost = source["remoteHost"];
	        this.remotePort = source["remotePort"];
	        this.status = source["status"];
	    }
	}
	export class SSHSession {
	    id: string;
	    serverId: string;
	    serverName: string;
	    status: string;
	    // Go type: time
	    connectedAt?: any;
	    // Go type: time
	    disconnectedAt?: any;
	    tunnels: SSHTunnel[];
	    errorMessage?: string;
	
	    static createFrom(source: any = {}) {
	        return new SSHSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.serverId = source["serverId"];
	        this.serverName = source["serverName"];
	        this.status = source["status"];
	        this.connectedAt = this.convertValues(source["connectedAt"], null);
	        this.disconnectedAt = this.convertValues(source["disconnectedAt"], null);
	        this.tunnels = this.convertValues(source["tunnels"], SSHTunnel);
	        this.errorMessage = source["errorMessage"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SmartRecommendation {
	    id: string;
	    type: string;
	    severity: string;
	    title: string;
	    description: string;
	    impact: ImpactEstimate;
	    affectedQueries: string[];
	    fix: RecommendationFix;
	    estimatedEffort: string;
	
	    static createFrom(source: any = {}) {
	        return new SmartRecommendation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.severity = source["severity"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.impact = this.convertValues(source["impact"], ImpactEstimate);
	        this.affectedQueries = source["affectedQueries"];
	        this.fix = this.convertValues(source["fix"], RecommendationFix);
	        this.estimatedEffort = source["estimatedEffort"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

