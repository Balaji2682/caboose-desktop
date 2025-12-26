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

