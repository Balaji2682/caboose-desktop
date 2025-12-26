import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  GitStatus,
  GitFileStatus,
  GitDiff,
  GitBlameFile,
  GitCommit,
  GitBranch,
  GitConflictFile,
  GitDiffOptions,
  GitLogOptions,
  GitCommitOptions,
} from '@/types/git';
import { isWailsEnv } from '@/lib/wails';

interface GitState {
  // Repository state
  isGitRepo: boolean;
  status: GitStatus | null;
  branches: GitBranch[];
  commits: GitCommit[];

  // UI state
  selectedFiles: string[];
  currentDiff: GitDiff | null;
  currentBlame: GitBlameFile | null;
  currentConflict: GitConflictFile | null;
  diffViewMode: 'side-by-side' | 'unified';

  // Loading states
  isLoadingStatus: boolean;
  isLoadingDiff: boolean;
  isLoadingBlame: boolean;
  isLoadingCommits: boolean;
  isLoadingBranches: boolean;

  // Actions
  checkRepository: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadBranches: () => Promise<void>;
  loadCommits: (options?: GitLogOptions) => Promise<void>;
  loadDiff: (options: GitDiffOptions) => Promise<void>;
  loadBlame: (filePath: string) => Promise<void>;
  loadConflict: (filePath: string) => Promise<void>;

  // Git operations
  stageFiles: (files: string[]) => Promise<void>;
  unstageFiles: (files: string[]) => Promise<void>;
  commit: (options: GitCommitOptions) => Promise<void>;
  revertFile: (filePath: string) => Promise<void>;
  revertFileToCommit: (filePath: string, commitHash: string) => Promise<void>;
  discardChanges: (filePath: string) => Promise<void>;
  resolveConflict: (filePath: string, resolution: 'ours' | 'theirs') => Promise<void>;

  // Branch operations
  createBranch: (name: string, startPoint?: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string, force?: boolean) => Promise<void>;

  // UI actions
  setSelectedFiles: (files: string[]) => void;
  setDiffViewMode: (mode: 'side-by-side' | 'unified') => void;
  clearDiff: () => void;
  clearBlame: () => void;
  clearConflict: () => void;
}

export const useGitStore = create<GitState>()(
  immer((set, get) => ({
    // Initial state
    isGitRepo: false,
    status: null,
    branches: [],
    commits: [],
    selectedFiles: [],
    currentDiff: null,
    currentBlame: null,
    currentConflict: null,
    diffViewMode: 'side-by-side',
    isLoadingStatus: false,
    isLoadingDiff: false,
    isLoadingBlame: false,
    isLoadingCommits: false,
    isLoadingBranches: false,

    // Check if current directory is a git repository
    checkRepository: async () => {
      if (!isWailsEnv()) return;

      try {
        const isGit = await window.go.main.App.IsGitRepository();
        set((state) => {
          state.isGitRepo = isGit;
        });

        if (isGit) {
          await get().refreshStatus();
          await get().loadBranches();
        }
      } catch (error) {
        console.error('Failed to check git repository:', error);
        set((state) => {
          state.isGitRepo = false;
        });
      }
    },

    // Refresh git status
    refreshStatus: async () => {
      if (!isWailsEnv()) return;

      set((state) => {
        state.isLoadingStatus = true;
      });

      try {
        const status = await window.go.main.App.GetGitStatus();
        set((state) => {
          state.status = status;
          state.isLoadingStatus = false;
        });
      } catch (error) {
        console.error('Failed to get git status:', error);
        set((state) => {
          state.isLoadingStatus = false;
        });
      }
    },

    // Load branches
    loadBranches: async () => {
      if (!isWailsEnv()) return;

      set((state) => {
        state.isLoadingBranches = true;
      });

      try {
        const branches = await window.go.main.App.GetGitBranches();
        set((state) => {
          state.branches = branches;
          state.isLoadingBranches = false;
        });
      } catch (error) {
        console.error('Failed to load branches:', error);
        set((state) => {
          state.isLoadingBranches = false;
        });
      }
    },

    // Load commit history
    loadCommits: async (options?: GitLogOptions) => {
      if (!isWailsEnv()) return;

      set((state) => {
        state.isLoadingCommits = true;
      });

      try {
        const commits = await window.go.main.App.GetGitLog(options || { maxCount: 100 });
        set((state) => {
          state.commits = commits;
          state.isLoadingCommits = false;
        });
      } catch (error) {
        console.error('Failed to load commits:', error);
        set((state) => {
          state.isLoadingCommits = false;
        });
      }
    },

    // Load diff for a file or entire repository
    loadDiff: async (options: GitDiffOptions) => {
      if (!isWailsEnv()) return;

      set((state) => {
        state.isLoadingDiff = true;
      });

      try {
        const diffs = await window.go.main.App.GetGitDiff(options);
        set((state) => {
          // For single file diff, store the first result
          state.currentDiff = diffs.length > 0 ? diffs[0] : null;
          state.isLoadingDiff = false;
        });
      } catch (error) {
        console.error('Failed to load diff:', error);
        set((state) => {
          state.currentDiff = null;
          state.isLoadingDiff = false;
        });
      }
    },

    // Load blame information for a file
    loadBlame: async (filePath: string) => {
      if (!isWailsEnv()) return;

      set((state) => {
        state.isLoadingBlame = true;
      });

      try {
        const blame = await window.go.main.App.GetGitBlame(filePath);
        set((state) => {
          state.currentBlame = blame;
          state.isLoadingBlame = false;
        });
      } catch (error) {
        console.error('Failed to load blame:', error);
        set((state) => {
          state.currentBlame = null;
          state.isLoadingBlame = false;
        });
      }
    },

    // Load conflict information for a file
    loadConflict: async (filePath: string) => {
      if (!isWailsEnv()) return;

      try {
        const conflict = await window.go.main.App.GetConflictFile(filePath);
        set((state) => {
          state.currentConflict = conflict;
        });
      } catch (error) {
        console.error('Failed to load conflict:', error);
        set((state) => {
          state.currentConflict = null;
        });
      }
    },

    // Stage files
    stageFiles: async (files: string[]) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.StageFiles(files);
        await get().refreshStatus();
      } catch (error) {
        console.error('Failed to stage files:', error);
        throw error;
      }
    },

    // Unstage files
    unstageFiles: async (files: string[]) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.UnstageFiles(files);
        await get().refreshStatus();
      } catch (error) {
        console.error('Failed to unstage files:', error);
        throw error;
      }
    },

    // Commit changes
    commit: async (options: GitCommitOptions) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.CommitChanges(options);
        await get().refreshStatus();
        await get().loadCommits();
      } catch (error) {
        console.error('Failed to commit:', error);
        throw error;
      }
    },

    // Revert file to HEAD
    revertFile: async (filePath: string) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.RevertFile(filePath);
        await get().refreshStatus();
      } catch (error) {
        console.error('Failed to revert file:', error);
        throw error;
      }
    },

    // Revert file to specific commit
    revertFileToCommit: async (filePath: string, commitHash: string) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.RevertFileToCommit(filePath, commitHash);
        await get().refreshStatus();
      } catch (error) {
        console.error('Failed to revert file to commit:', error);
        throw error;
      }
    },

    // Discard changes in a file
    discardChanges: async (filePath: string) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.DiscardChanges(filePath);
        await get().refreshStatus();
      } catch (error) {
        console.error('Failed to discard changes:', error);
        throw error;
      }
    },

    // Resolve conflict
    resolveConflict: async (filePath: string, resolution: 'ours' | 'theirs') => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.ResolveConflict(filePath, resolution);
        await get().refreshStatus();
        set((state) => {
          state.currentConflict = null;
        });
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
        throw error;
      }
    },

    // Create branch
    createBranch: async (name: string, startPoint?: string) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.CreateGitBranch(name, startPoint || '');
        await get().loadBranches();
      } catch (error) {
        console.error('Failed to create branch:', error);
        throw error;
      }
    },

    // Checkout branch
    checkoutBranch: async (name: string) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.CheckoutGitBranch(name);
        await get().loadBranches();
        await get().refreshStatus();
      } catch (error) {
        console.error('Failed to checkout branch:', error);
        throw error;
      }
    },

    // Delete branch
    deleteBranch: async (name: string, force?: boolean) => {
      if (!isWailsEnv()) return;

      try {
        await window.go.main.App.DeleteGitBranch(name, force || false);
        await get().loadBranches();
      } catch (error) {
        console.error('Failed to delete branch:', error);
        throw error;
      }
    },

    // UI actions
    setSelectedFiles: (files: string[]) => {
      set((state) => {
        state.selectedFiles = files;
      });
    },

    setDiffViewMode: (mode: 'side-by-side' | 'unified') => {
      set((state) => {
        state.diffViewMode = mode;
      });
    },

    clearDiff: () => {
      set((state) => {
        state.currentDiff = null;
      });
    },

    clearBlame: () => {
      set((state) => {
        state.currentBlame = null;
      });
    },

    clearConflict: () => {
      set((state) => {
        state.currentConflict = null;
      });
    },
  }))
);
