export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflict';
  stagingStatus: 'staged' | 'unstaged' | 'both';
  oldPath?: string; // For renamed files
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: string[];
}

export interface GitDiff {
  filePath: string;
  oldPath?: string; // For renames
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  oldMode?: string;
  newMode?: string;
  hunks: GitDiffHunk[];
  isBinary: boolean;
  oldSha?: string;
  newSha?: string;
}

export interface GitBlameLine {
  lineNumber: number;
  content: string;
  commitHash: string;
  author: string;
  authorEmail: string;
  authorDate: string; // ISO 8601 format
  commitMessage: string;
  commitSummary: string; // First line of commit message
}

export interface GitBlameFile {
  filePath: string;
  lines: GitBlameLine[];
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  authorDate: string; // ISO 8601 format
  committer: string;
  committerEmail: string;
  committerDate: string; // ISO 8601 format
  message: string;
  summary: string; // First line of message
  parents: string[];
  files?: string[]; // Files changed in this commit
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
  commitHash: string;
}

export interface GitStatus {
  currentBranch: string;
  ahead: number; // Commits ahead of upstream
  behind: number; // Commits behind upstream
  files: GitFileStatus[];
  hasConflicts: boolean;
}

export interface GitConflictRegion {
  startLine: number;
  endLine: number;
  oursLines: string[];
  theirsLines: string[];
  baseLines?: string[];
}

export interface GitConflictFile {
  path: string;
  oursContent: string; // Current branch version
  theirsContent: string; // Incoming branch version
  baseContent: string; // Common ancestor version
  conflictRegions: GitConflictRegion[];
}

export interface GitStash {
  index: number;
  message: string;
  branch: string;
  hash: string;
}

export interface GitLogOptions {
  maxCount?: number;
  skip?: number;
  author?: string;
  since?: string;
  until?: string;
  path?: string; // Filter by file path
  branch?: string;
  allBranches?: boolean;
}

export interface GitCommitOptions {
  message: string;
  files?: string[]; // Files to stage and commit (empty = all staged)
  amend?: boolean;
  author?: string; // Format: "Name <email>"
}

export interface GitMergeResult {
  success: boolean;
  conflicts?: GitConflictFile[];
  message: string;
}

export interface GitDiffOptions {
  filePath?: string;
  staged?: boolean; // Show staged changes
  cached?: boolean; // Alias for staged
  ref?: string; // Compare against ref (e.g., "HEAD", "main")
  refA?: string; // Compare refA..refB
  refB?: string;
  context?: number; // Lines of context (default 3)
}

// UI-specific types

export interface DiffLineInfo {
  oldLineNum?: number; // undefined for added lines
  newLineNum?: number; // undefined for deleted lines
  type: 'context' | 'addition' | 'deletion';
  content: string;
}

export interface ConflictResolution {
  path: string;
  resolution: 'ours' | 'theirs' | 'manual';
  manualContent?: string; // For manual resolution
}
