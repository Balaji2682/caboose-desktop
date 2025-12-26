package models

import "time"

// GitFileStatus represents the status of a file in git
type GitFileStatus struct {
	Path          string `json:"path"`
	Status        string `json:"status"` // "modified", "added", "deleted", "renamed", "copied", "untracked", "conflict"
	StagingStatus string `json:"stagingStatus"` // "staged", "unstaged", "both"
	OldPath       string `json:"oldPath,omitempty"` // For renamed files
}

// GitDiffHunk represents a hunk in a diff
type GitDiffHunk struct {
	OldStart int      `json:"oldStart"`
	OldLines int      `json:"oldLines"`
	NewStart int      `json:"newStart"`
	NewLines int      `json:"newLines"`
	Header   string   `json:"header"`
	Lines    []string `json:"lines"`
}

// GitDiff represents the diff of a file
type GitDiff struct {
	FilePath  string        `json:"filePath"`
	OldPath   string        `json:"oldPath,omitempty"` // For renames
	Status    string        `json:"status"` // "modified", "added", "deleted", "renamed"
	OldMode   string        `json:"oldMode,omitempty"`
	NewMode   string        `json:"newMode,omitempty"`
	Hunks     []GitDiffHunk `json:"hunks"`
	IsBinary  bool          `json:"isBinary"`
	OldSHA    string        `json:"oldSha,omitempty"`
	NewSHA    string        `json:"newSha,omitempty"`
}

// GitBlameLine represents a line with blame information
type GitBlameLine struct {
	LineNumber    int       `json:"lineNumber"`
	Content       string    `json:"content"`
	CommitHash    string    `json:"commitHash"`
	Author        string    `json:"author"`
	AuthorEmail   string    `json:"authorEmail"`
	AuthorDate    time.Time `json:"authorDate"`
	CommitMessage string    `json:"commitMessage"`
	CommitSummary string    `json:"commitSummary"` // First line of commit message
}

// GitBlameFile represents blame information for entire file
type GitBlameFile struct {
	FilePath string         `json:"filePath"`
	Lines    []GitBlameLine `json:"lines"`
}

// GitCommit represents a commit
type GitCommit struct {
	Hash          string    `json:"hash"`
	ShortHash     string    `json:"shortHash"`
	Author        string    `json:"author"`
	AuthorEmail   string    `json:"authorEmail"`
	AuthorDate    time.Time `json:"authorDate"`
	Committer     string    `json:"committer"`
	CommitterEmail string   `json:"committerEmail"`
	CommitterDate time.Time `json:"committerDate"`
	Message       string    `json:"message"`
	Summary       string    `json:"summary"` // First line of message
	Parents       []string  `json:"parents"`
	Files         []string  `json:"files,omitempty"` // Files changed in this commit
}

// GitBranch represents a git branch
type GitBranch struct {
	Name      string `json:"name"`
	Current   bool   `json:"current"`
	Remote    string `json:"remote,omitempty"`
	Upstream  string `json:"upstream,omitempty"`
	CommitHash string `json:"commitHash"`
}

// GitStatus represents the status of the repository
type GitStatus struct {
	CurrentBranch string          `json:"currentBranch"`
	Ahead         int             `json:"ahead"` // Commits ahead of upstream
	Behind        int             `json:"behind"` // Commits behind upstream
	Files         []GitFileStatus `json:"files"`
	HasConflicts  bool            `json:"hasConflicts"`
}

// GitConflictFile represents a file with merge conflicts
type GitConflictFile struct {
	Path           string   `json:"path"`
	OursContent    string   `json:"oursContent"`    // Current branch version
	TheirsContent  string   `json:"theirsContent"`  // Incoming branch version
	BaseContent    string   `json:"baseContent"`    // Common ancestor version
	ConflictRegions []GitConflictRegion `json:"conflictRegions"`
}

// GitConflictRegion represents a conflict region in a file
type GitConflictRegion struct {
	StartLine   int      `json:"startLine"`
	EndLine     int      `json:"endLine"`
	OursLines   []string `json:"oursLines"`
	TheirsLines []string `json:"theirsLines"`
	BaseLines   []string `json:"baseLines,omitempty"`
}

// GitStash represents a stash entry
type GitStash struct {
	Index   int    `json:"index"`
	Message string `json:"message"`
	Branch  string `json:"branch"`
	Hash    string `json:"hash"`
}

// GitLogOptions represents options for git log
type GitLogOptions struct {
	MaxCount   int      `json:"maxCount"`
	Skip       int      `json:"skip"`
	Author     string   `json:"author,omitempty"`
	Since      string   `json:"since,omitempty"`
	Until      string   `json:"until,omitempty"`
	Path       string   `json:"path,omitempty"` // Filter by file path
	Branch     string   `json:"branch,omitempty"`
	AllBranches bool    `json:"allBranches"`
}

// GitCommitOptions represents options for creating a commit
type GitCommitOptions struct {
	Message string   `json:"message"`
	Files   []string `json:"files,omitempty"` // Files to stage and commit (empty = all staged)
	Amend   bool     `json:"amend"`
	Author  string   `json:"author,omitempty"` // Format: "Name <email>"
}

// GitMergeResult represents the result of a merge operation
type GitMergeResult struct {
	Success   bool              `json:"success"`
	Conflicts []GitConflictFile `json:"conflicts,omitempty"`
	Message   string            `json:"message"`
}

// GitDiffOptions represents options for generating diffs
type GitDiffOptions struct {
	FilePath  string `json:"filePath,omitempty"`
	Staged    bool   `json:"staged"` // Show staged changes
	Cached    bool   `json:"cached"` // Alias for staged
	Ref       string `json:"ref,omitempty"` // Compare against ref (e.g., "HEAD", "main")
	RefA      string `json:"refA,omitempty"` // Compare refA..refB
	RefB      string `json:"refB,omitempty"`
	Context   int    `json:"context"` // Lines of context (default 3)
}
