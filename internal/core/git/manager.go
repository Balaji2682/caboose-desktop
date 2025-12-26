package git

import (
	"bufio"
	"bytes"
	"fmt"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/caboose-desktop/internal/models"
)

// Manager handles Git operations
type Manager struct {
	workingDir string
}

// NewManager creates a new Git manager
func NewManager(workingDir string) *Manager {
	return &Manager{
		workingDir: workingDir,
	}
}

// SetWorkingDir changes the working directory
func (m *Manager) SetWorkingDir(dir string) {
	m.workingDir = dir
}

// execGit executes a git command and returns the output
func (m *Manager) execGit(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = m.workingDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("git %s failed: %w\n%s", strings.Join(args, " "), err, stderr.String())
	}

	return stdout.String(), nil
}

// IsGitRepository checks if the working directory is a git repository
func (m *Manager) IsGitRepository() bool {
	_, err := m.execGit("rev-parse", "--git-dir")
	return err == nil
}

// GetStatus returns the current repository status
func (m *Manager) GetStatus() (*models.GitStatus, error) {
	output, err := m.execGit("status", "--porcelain=v2", "--branch")
	if err != nil {
		return nil, err
	}

	status := &models.GitStatus{
		Files: []models.GitFileStatus{},
	}

	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "# branch.head ") {
			status.CurrentBranch = strings.TrimPrefix(line, "# branch.head ")
		} else if strings.HasPrefix(line, "# branch.ab ") {
			parts := strings.Fields(line)
			if len(parts) >= 4 {
				status.Ahead, _ = strconv.Atoi(parts[2])
				status.Behind, _ = strconv.Atoi(parts[3])
			}
		} else if strings.HasPrefix(line, "1 ") || strings.HasPrefix(line, "2 ") {
			// Changed file
			fileStatus := m.parseStatusLine(line)
			if fileStatus != nil {
				status.Files = append(status.Files, *fileStatus)
				if fileStatus.Status == "conflict" {
					status.HasConflicts = true
				}
			}
		} else if strings.HasPrefix(line, "? ") {
			// Untracked file
			path := strings.TrimPrefix(line, "? ")
			status.Files = append(status.Files, models.GitFileStatus{
				Path:          path,
				Status:        "untracked",
				StagingStatus: "unstaged",
			})
		} else if strings.HasPrefix(line, "u ") {
			// Unmerged/conflict file
			parts := strings.Fields(line)
			if len(parts) >= 11 {
				status.Files = append(status.Files, models.GitFileStatus{
					Path:          parts[10],
					Status:        "conflict",
					StagingStatus: "both",
				})
				status.HasConflicts = true
			}
		}
	}

	return status, nil
}

// parseStatusLine parses a porcelain v2 status line
func (m *Manager) parseStatusLine(line string) *models.GitFileStatus {
	parts := strings.Fields(line)
	if len(parts) < 9 {
		return nil
	}

	xy := parts[1] // XY status (staged/unstaged)
	path := parts[8]

	fileStatus := &models.GitFileStatus{
		Path: path,
	}

	// Parse XY status
	x := string(xy[0]) // staged status
	y := string(xy[1]) // unstaged status

	// Determine staging status
	if x != "." && y != "." {
		fileStatus.StagingStatus = "both"
	} else if x != "." {
		fileStatus.StagingStatus = "staged"
	} else {
		fileStatus.StagingStatus = "unstaged"
	}

	// Determine file status
	switch {
	case x == "A" || y == "A":
		fileStatus.Status = "added"
	case x == "M" || y == "M":
		fileStatus.Status = "modified"
	case x == "D" || y == "D":
		fileStatus.Status = "deleted"
	case x == "R" || y == "R":
		fileStatus.Status = "renamed"
		if len(parts) >= 10 {
			fileStatus.OldPath = parts[9]
		}
	case x == "C" || y == "C":
		fileStatus.Status = "copied"
	case x == "U" || y == "U":
		fileStatus.Status = "conflict"
	default:
		fileStatus.Status = "modified"
	}

	return fileStatus
}

// GetDiff returns the diff for a file or the entire repository
func (m *Manager) GetDiff(options models.GitDiffOptions) ([]models.GitDiff, error) {
	args := []string{"diff"}

	// Add context lines
	if options.Context > 0 {
		args = append(args, fmt.Sprintf("-U%d", options.Context))
	} else {
		args = append(args, "-U3") // Default 3 lines
	}

	// Add staged flag
	if options.Staged || options.Cached {
		args = append(args, "--cached")
	}

	// Add refs
	if options.RefA != "" && options.RefB != "" {
		args = append(args, fmt.Sprintf("%s..%s", options.RefA, options.RefB))
	} else if options.Ref != "" {
		args = append(args, options.Ref)
	}

	// Add file path
	if options.FilePath != "" {
		args = append(args, "--", options.FilePath)
	}

	output, err := m.execGit(args...)
	if err != nil {
		return nil, err
	}

	return m.parseDiff(output)
}

// parseDiff parses git diff output
func (m *Manager) parseDiff(output string) ([]models.GitDiff, error) {
	var diffs []models.GitDiff
	var currentDiff *models.GitDiff
	var currentHunk *models.GitDiffHunk

	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "diff --git") {
			// Save previous diff
			if currentDiff != nil && currentHunk != nil {
				currentDiff.Hunks = append(currentDiff.Hunks, *currentHunk)
			}
			if currentDiff != nil {
				diffs = append(diffs, *currentDiff)
			}

			// Start new diff
			currentDiff = &models.GitDiff{
				Hunks: []models.GitDiffHunk{},
			}
			currentHunk = nil

			// Extract file paths
			re := regexp.MustCompile(`diff --git a/(.*) b/(.*)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) >= 3 {
				currentDiff.OldPath = matches[1]
				currentDiff.FilePath = matches[2]
			}
		} else if currentDiff != nil {
			if strings.HasPrefix(line, "--- ") {
				// Old file marker
				continue
			} else if strings.HasPrefix(line, "+++ ") {
				// New file marker
				continue
			} else if strings.HasPrefix(line, "old mode ") {
				currentDiff.OldMode = strings.TrimPrefix(line, "old mode ")
			} else if strings.HasPrefix(line, "new mode ") {
				currentDiff.NewMode = strings.TrimPrefix(line, "new mode ")
			} else if strings.HasPrefix(line, "deleted file mode ") {
				currentDiff.Status = "deleted"
			} else if strings.HasPrefix(line, "new file mode ") {
				currentDiff.Status = "added"
			} else if strings.HasPrefix(line, "rename from ") {
				currentDiff.Status = "renamed"
				currentDiff.OldPath = strings.TrimPrefix(line, "rename from ")
			} else if strings.HasPrefix(line, "rename to ") {
				currentDiff.FilePath = strings.TrimPrefix(line, "rename to ")
			} else if strings.HasPrefix(line, "Binary files ") {
				currentDiff.IsBinary = true
			} else if strings.HasPrefix(line, "@@") {
				// Save previous hunk
				if currentHunk != nil {
					currentDiff.Hunks = append(currentDiff.Hunks, *currentHunk)
				}

				// Start new hunk
				currentHunk = &models.GitDiffHunk{
					Header: line,
					Lines:  []string{},
				}

				// Parse hunk header: @@ -old_start,old_lines +new_start,new_lines @@
				re := regexp.MustCompile(`@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@`)
				matches := re.FindStringSubmatch(line)
				if len(matches) >= 5 {
					currentHunk.OldStart, _ = strconv.Atoi(matches[1])
					if matches[2] != "" {
						currentHunk.OldLines, _ = strconv.Atoi(matches[2])
					} else {
						currentHunk.OldLines = 1
					}
					currentHunk.NewStart, _ = strconv.Atoi(matches[3])
					if matches[4] != "" {
						currentHunk.NewLines, _ = strconv.Atoi(matches[4])
					} else {
						currentHunk.NewLines = 1
					}
				}
			} else if currentHunk != nil {
				// Diff line
				currentHunk.Lines = append(currentHunk.Lines, line)
			}
		}
	}

	// Save last diff and hunk
	if currentDiff != nil && currentHunk != nil {
		currentDiff.Hunks = append(currentDiff.Hunks, *currentHunk)
	}
	if currentDiff != nil {
		// Set default status if not set
		if currentDiff.Status == "" {
			currentDiff.Status = "modified"
		}
		diffs = append(diffs, *currentDiff)
	}

	return diffs, nil
}

// GetBlame returns blame information for a file
func (m *Manager) GetBlame(filePath string) (*models.GitBlameFile, error) {
	// Use porcelain format for easier parsing
	output, err := m.execGit("blame", "--porcelain", "--", filePath)
	if err != nil {
		return nil, err
	}

	blameFile := &models.GitBlameFile{
		FilePath: filePath,
		Lines:    []models.GitBlameLine{},
	}

	// Parse porcelain format
	var currentLine *models.GitBlameLine
	commitCache := make(map[string]*models.GitBlameLine) // Cache commit info

	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()

		if len(line) == 0 {
			continue
		}

		// Commit hash line: <hash> <original-line> <final-line> <num-lines>
		if !strings.HasPrefix(line, "\t") && !strings.Contains(line, " ") || (strings.Contains(line, " ") && len(strings.Fields(line)) >= 3) {
			fields := strings.Fields(line)
			if len(fields) >= 3 {
				hash := fields[0]
				lineNum, _ := strconv.Atoi(fields[2])

				// Check cache
				if cached, ok := commitCache[hash]; ok {
					currentLine = &models.GitBlameLine{
						LineNumber:    lineNum,
						CommitHash:    cached.CommitHash,
						Author:        cached.Author,
						AuthorEmail:   cached.AuthorEmail,
						AuthorDate:    cached.AuthorDate,
						CommitMessage: cached.CommitMessage,
						CommitSummary: cached.CommitSummary,
					}
				} else {
					currentLine = &models.GitBlameLine{
						LineNumber: lineNum,
						CommitHash: hash,
					}
				}
			}
		} else if currentLine != nil {
			if strings.HasPrefix(line, "author ") {
				currentLine.Author = strings.TrimPrefix(line, "author ")
			} else if strings.HasPrefix(line, "author-mail ") {
				email := strings.TrimPrefix(line, "author-mail ")
				currentLine.AuthorEmail = strings.Trim(email, "<>")
			} else if strings.HasPrefix(line, "author-time ") {
				timeStr := strings.TrimPrefix(line, "author-time ")
				timestamp, _ := strconv.ParseInt(timeStr, 10, 64)
				currentLine.AuthorDate = time.Unix(timestamp, 0)
			} else if strings.HasPrefix(line, "summary ") {
				currentLine.CommitSummary = strings.TrimPrefix(line, "summary ")
				currentLine.CommitMessage = currentLine.CommitSummary
			} else if strings.HasPrefix(line, "\t") {
				// Actual code line
				currentLine.Content = strings.TrimPrefix(line, "\t")
				blameFile.Lines = append(blameFile.Lines, *currentLine)

				// Cache commit info
				if _, cached := commitCache[currentLine.CommitHash]; !cached {
					commitCache[currentLine.CommitHash] = currentLine
				}

				currentLine = nil
			}
		}
	}

	return blameFile, nil
}

// GetLog returns commit history
func (m *Manager) GetLog(options models.GitLogOptions) ([]models.GitCommit, error) {
	args := []string{"log", "--pretty=format:%H%n%h%n%an%n%ae%n%at%n%cn%n%ce%n%ct%n%s%n%b%n--END--"}

	if options.MaxCount > 0 {
		args = append(args, fmt.Sprintf("--max-count=%d", options.MaxCount))
	}
	if options.Skip > 0 {
		args = append(args, fmt.Sprintf("--skip=%d", options.Skip))
	}
	if options.Author != "" {
		args = append(args, fmt.Sprintf("--author=%s", options.Author))
	}
	if options.Since != "" {
		args = append(args, fmt.Sprintf("--since=%s", options.Since))
	}
	if options.Until != "" {
		args = append(args, fmt.Sprintf("--until=%s", options.Until))
	}
	if options.AllBranches {
		args = append(args, "--all")
	} else if options.Branch != "" {
		args = append(args, options.Branch)
	}
	if options.Path != "" {
		args = append(args, "--", options.Path)
	}

	output, err := m.execGit(args...)
	if err != nil {
		return nil, err
	}

	return m.parseLog(output)
}

// parseLog parses git log output
func (m *Manager) parseLog(output string) ([]models.GitCommit, error) {
	commits := []models.GitCommit{}

	entries := strings.Split(output, "\n--END--\n")
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}

		lines := strings.Split(entry, "\n")
		if len(lines) < 9 {
			continue
		}

		commit := models.GitCommit{
			Hash:          lines[0],
			ShortHash:     lines[1],
			Author:        lines[2],
			AuthorEmail:   lines[3],
			Committer:     lines[5],
			CommitterEmail: lines[6],
			Summary:       lines[8],
		}

		// Parse timestamps
		if authorTime, err := strconv.ParseInt(lines[4], 10, 64); err == nil {
			commit.AuthorDate = time.Unix(authorTime, 0)
		}
		if committerTime, err := strconv.ParseInt(lines[7], 10, 64); err == nil {
			commit.CommitterDate = time.Unix(committerTime, 0)
		}

		// Combine summary and body
		if len(lines) > 9 {
			commit.Message = strings.Join(lines[8:], "\n")
		} else {
			commit.Message = commit.Summary
		}

		commits = append(commits, commit)
	}

	return commits, nil
}

// Stage stages files
func (m *Manager) Stage(files []string) error {
	if len(files) == 0 {
		return nil
	}

	args := append([]string{"add"}, files...)
	_, err := m.execGit(args...)
	return err
}

// Unstage unstages files
func (m *Manager) Unstage(files []string) error {
	if len(files) == 0 {
		return nil
	}

	args := append([]string{"reset", "HEAD"}, files...)
	_, err := m.execGit(args...)
	return err
}

// Commit creates a commit
func (m *Manager) Commit(options models.GitCommitOptions) error {
	// Stage files if specified
	if len(options.Files) > 0 {
		if err := m.Stage(options.Files); err != nil {
			return err
		}
	}

	args := []string{"commit", "-m", options.Message}

	if options.Amend {
		args = append(args, "--amend")
	}
	if options.Author != "" {
		args = append(args, "--author", options.Author)
	}

	_, err := m.execGit(args...)
	return err
}

// Revert reverts a file to HEAD
func (m *Manager) RevertFile(filePath string) error {
	_, err := m.execGit("checkout", "HEAD", "--", filePath)
	return err
}

// RevertToCommit reverts a file to a specific commit
func (m *Manager) RevertToCommit(filePath string, commitHash string) error {
	_, err := m.execGit("checkout", commitHash, "--", filePath)
	return err
}

// DiscardChanges discards all changes in a file
func (m *Manager) DiscardChanges(filePath string) error {
	_, err := m.execGit("checkout", "--", filePath)
	return err
}

// GetConflictFile returns conflict information for a file
func (m *Manager) GetConflictFile(filePath string) (*models.GitConflictFile, error) {
	// Get "ours" version (current branch)
	oursOutput, err := m.execGit("show", ":2:"+filePath)
	if err != nil {
		oursOutput = "" // May not exist
	}

	// Get "theirs" version (incoming branch)
	theirsOutput, err := m.execGit("show", ":3:"+filePath)
	if err != nil {
		theirsOutput = "" // May not exist
	}

	// Get base version (common ancestor)
	baseOutput, err := m.execGit("show", ":1:"+filePath)
	if err != nil {
		baseOutput = "" // May not exist
	}

	// Parse conflict markers from working tree version
	workingContent, err := m.execGit("show", ":0:"+filePath)
	if err != nil {
		// File may not be in index, read from working tree
		absPath := filepath.Join(m.workingDir, filePath)
		cmd := exec.Command("cat", absPath)
		var stdout bytes.Buffer
		cmd.Stdout = &stdout
		if err := cmd.Run(); err == nil {
			workingContent = stdout.String()
		}
	}

	conflict := &models.GitConflictFile{
		Path:          filePath,
		OursContent:   oursOutput,
		TheirsContent: theirsOutput,
		BaseContent:   baseOutput,
		ConflictRegions: m.parseConflictMarkers(workingContent),
	}

	return conflict, nil
}

// parseConflictMarkers parses conflict markers from file content
func (m *Manager) parseConflictMarkers(content string) []models.GitConflictRegion {
	regions := []models.GitConflictRegion{}

	lines := strings.Split(content, "\n")
	inConflict := false
	var currentRegion *models.GitConflictRegion
	inOurs := false
	inTheirs := false

	for i, line := range lines {
		if strings.HasPrefix(line, "<<<<<<<") {
			// Start of conflict
			inConflict = true
			inOurs = true
			currentRegion = &models.GitConflictRegion{
				StartLine:   i + 1,
				OursLines:   []string{},
				TheirsLines: []string{},
				BaseLines:   []string{},
			}
		} else if strings.HasPrefix(line, "=======") && inConflict {
			// Switch from ours to theirs
			inOurs = false
			inTheirs = true
		} else if strings.HasPrefix(line, ">>>>>>>") && inConflict {
			// End of conflict
			inConflict = false
			inTheirs = false
			currentRegion.EndLine = i + 1
			regions = append(regions, *currentRegion)
			currentRegion = nil
		} else if inConflict {
			if inOurs {
				currentRegion.OursLines = append(currentRegion.OursLines, line)
			} else if inTheirs {
				currentRegion.TheirsLines = append(currentRegion.TheirsLines, line)
			}
		}
	}

	return regions
}

// ResolveConflict resolves a conflict by accepting a version
func (m *Manager) ResolveConflict(filePath string, resolution string) error {
	switch resolution {
	case "ours":
		_, err := m.execGit("checkout", "--ours", "--", filePath)
		if err != nil {
			return err
		}
	case "theirs":
		_, err := m.execGit("checkout", "--theirs", "--", filePath)
		if err != nil {
			return err
		}
	default:
		return fmt.Errorf("invalid resolution: %s (must be 'ours' or 'theirs')", resolution)
	}

	// Stage the resolved file
	return m.Stage([]string{filePath})
}

// GetBranches returns all branches
func (m *Manager) GetBranches() ([]models.GitBranch, error) {
	output, err := m.execGit("branch", "-vv", "--all")
	if err != nil {
		return nil, err
	}

	branches := []models.GitBranch{}
	scanner := bufio.NewScanner(strings.NewReader(output))

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		branch := models.GitBranch{}

		// Check if current branch
		if strings.HasPrefix(line, "*") {
			branch.Current = true
			line = strings.TrimPrefix(line, "* ")
		} else {
			line = strings.TrimPrefix(line, "  ")
		}

		// Parse branch info
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			branch.Name = parts[0]
			branch.CommitHash = parts[1]

			// Parse upstream if present
			if len(parts) >= 3 && strings.HasPrefix(parts[2], "[") {
				upstream := strings.Trim(parts[2], "[]")
				branch.Upstream = upstream
			}
		}

		branches = append(branches, branch)
	}

	return branches, nil
}

// CreateBranch creates a new branch
func (m *Manager) CreateBranch(name string, startPoint string) error {
	args := []string{"branch", name}
	if startPoint != "" {
		args = append(args, startPoint)
	}
	_, err := m.execGit(args...)
	return err
}

// CheckoutBranch checks out a branch
func (m *Manager) CheckoutBranch(name string) error {
	_, err := m.execGit("checkout", name)
	return err
}

// DeleteBranch deletes a branch
func (m *Manager) DeleteBranch(name string, force bool) error {
	flag := "-d"
	if force {
		flag = "-D"
	}
	_, err := m.execGit("branch", flag, name)
	return err
}
