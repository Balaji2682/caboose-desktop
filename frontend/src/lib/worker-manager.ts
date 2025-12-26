/**
 * Web Worker Manager
 * Centralized worker lifecycle management with pooling and error handling
 */

type WorkerMessage = {
  type: string;
  data: any;
  id: string;
};

type WorkerResponse = {
  type: string;
  data: any;
  id: string;
  error?: string;
};

type WorkerCallback = (response: WorkerResponse) => void;

export class WorkerManager {
  private worker: Worker | null = null;
  private callbacks = new Map<string, WorkerCallback>();
  private messageId = 0;
  private ready = false;
  private readyCallbacks: Array<() => void> = [];

  constructor(private workerPath: string) {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      this.worker = new Worker(new URL(this.workerPath, import.meta.url), {
        type: 'module',
      });

      this.worker.addEventListener('message', this.handleMessage.bind(this));
      this.worker.addEventListener('error', this.handleError.bind(this));
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      throw error;
    }
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const { type, id } = event.data;

    // Handle init signal (worker is ready)
    if (id === 'init') {
      this.ready = true;
      this.readyCallbacks.forEach((cb) => cb());
      this.readyCallbacks = [];
      return;
    }

    // Handle response
    const callback = this.callbacks.get(id);
    if (callback) {
      callback(event.data);
      this.callbacks.delete(id);
    }
  }

  private handleError(error: ErrorEvent) {
    console.error('Worker error:', error);
    // Notify all pending callbacks
    this.callbacks.forEach((callback) => {
      callback({
        type: 'ERROR',
        data: null,
        id: '',
        error: error.message,
      });
    });
    this.callbacks.clear();
  }

  private async waitForReady(): Promise<void> {
    if (this.ready) return;

    return new Promise<void>((resolve) => {
      this.readyCallbacks.push(resolve);
    });
  }

  async postMessage<T = any>(type: string, data: any): Promise<T> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const id = `msg_${++this.messageId}`;

      this.callbacks.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data as T);
        }
      });

      const message: WorkerMessage = { type, data, id };
      this.worker?.postMessage(message);
    });
  }

  terminate() {
    this.worker?.terminate();
    this.callbacks.clear();
    this.worker = null;
    this.ready = false;
  }
}

// Worker pool for multiple instances
export class WorkerPool {
  private workers: WorkerManager[] = [];
  private currentIndex = 0;
  private workerPath: string;

  constructor(workerPath: string, poolSize: number = 4) {
    this.workerPath = workerPath;
    for (let i = 0; i < poolSize; i++) {
      this.workers.push(new WorkerManager(workerPath));
    }
  }

  async execute<T = any>(type: string, data: any): Promise<T> {
    // Round-robin worker selection
    const worker = this.workers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.workers.length;

    return worker.postMessage<T>(type, data);
  }

  terminate() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
  }
}

// Singleton worker instances
let logProcessorWorker: WorkerManager | null = null;
let queryAnalyzerWorker: WorkerManager | null = null;
let exceptionProcessorWorker: WorkerManager | null = null;

export function getLogProcessorWorker(): WorkerManager {
  if (!logProcessorWorker) {
    logProcessorWorker = new WorkerManager('../workers/log-processor.worker.ts');
  }
  return logProcessorWorker;
}

export function getQueryAnalyzerWorker(): WorkerManager {
  if (!queryAnalyzerWorker) {
    queryAnalyzerWorker = new WorkerManager('../workers/query-analyzer.worker.ts');
  }
  return queryAnalyzerWorker;
}

export function getExceptionProcessorWorker(): WorkerManager {
  if (!exceptionProcessorWorker) {
    exceptionProcessorWorker = new WorkerManager('../workers/exception-processor.worker.ts');
  }
  return exceptionProcessorWorker;
}

export function terminateAllWorkers() {
  logProcessorWorker?.terminate();
  queryAnalyzerWorker?.terminate();
  exceptionProcessorWorker?.terminate();
  logProcessorWorker = null;
  queryAnalyzerWorker = null;
  exceptionProcessorWorker = null;
}
