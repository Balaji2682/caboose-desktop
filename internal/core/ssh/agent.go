package ssh

import (
	"fmt"
	"log/slog"
	"net"
	"os"
	"path/filepath"

	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
	"golang.org/x/crypto/ssh/knownhosts"
)

// GetSSHAgent connects to the system SSH agent
func GetSSHAgent() (ssh.AuthMethod, error) {
	socket := os.Getenv("SSH_AUTH_SOCK")
	if socket == "" {
		return nil, fmt.Errorf("SSH_AUTH_SOCK not set - SSH agent not running")
	}

	conn, err := net.Dial("unix", socket)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to SSH agent: %w", err)
	}

	agentClient := agent.NewClient(conn)
	return ssh.PublicKeysCallback(agentClient.Signers), nil
}

// LoadPrivateKey loads an SSH private key from a file
func LoadPrivateKey(path string) (ssh.AuthMethod, error) {
	key, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read private key: %w", err)
	}

	signer, err := ssh.ParsePrivateKey(key)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	return ssh.PublicKeys(signer), nil
}

// GetKnownHostsCallback creates a HostKeyCallback for known_hosts verification
func GetKnownHostsCallback(knownHostsPath string) (ssh.HostKeyCallback, error) {
	// Use default known_hosts if no path specified
	if knownHostsPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get home directory: %w", err)
		}
		knownHostsPath = filepath.Join(home, ".ssh", "known_hosts")
	}

	// Check if known_hosts file exists
	if _, err := os.Stat(knownHostsPath); os.IsNotExist(err) {
		slog.Warn("known_hosts file not found, creating new one", "path", knownHostsPath)

		// Create .ssh directory if it doesn't exist
		sshDir := filepath.Dir(knownHostsPath)
		if err := os.MkdirAll(sshDir, 0700); err != nil {
			return nil, fmt.Errorf("failed to create .ssh directory: %w", err)
		}

		// Create empty known_hosts file
		if err := os.WriteFile(knownHostsPath, []byte{}, 0600); err != nil {
			return nil, fmt.Errorf("failed to create known_hosts file: %w", err)
		}
	}

	// Create the known_hosts callback
	callback, err := knownhosts.New(knownHostsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create known_hosts callback: %w", err)
	}

	// Wrap the callback to provide better error handling
	return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
		err := callback(hostname, remote, key)
		if err != nil {
			// Check if this is a key mismatch (potential MITM)
			if keyErr, ok := err.(*knownhosts.KeyError); ok {
				if len(keyErr.Want) > 0 {
					// Host key has changed - SECURITY WARNING
					slog.Error("HOST KEY VERIFICATION FAILED - POTENTIAL SECURITY BREACH",
						"host", hostname,
						"error", "remote host identification has changed")
					return fmt.Errorf("HOST KEY VERIFICATION FAILED for %s: remote host identification has changed. This could indicate a man-in-the-middle attack", hostname)
				}
				// Host is not in known_hosts - this is a new host
				slog.Warn("unknown host key",
					"host", hostname,
					"fingerprint", ssh.FingerprintSHA256(key))

				// For now, we'll return an error and require manual acceptance
				// In the future, we can add a callback to prompt the user
				return fmt.Errorf("unknown host %s (fingerprint: %s). Add to known_hosts to connect", hostname, ssh.FingerprintSHA256(key))
			}
			return err
		}

		slog.Debug("host key verified successfully", "host", hostname)
		return nil
	}, nil
}

// AddHostToKnownHosts adds a host key to the known_hosts file
func AddHostToKnownHosts(knownHostsPath, hostname string, remote net.Addr, key ssh.PublicKey) error {
	// Use default known_hosts if no path specified
	if knownHostsPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("failed to get home directory: %w", err)
		}
		knownHostsPath = filepath.Join(home, ".ssh", "known_hosts")
	}

	// Create the known_hosts entry
	entry := knownhosts.Line([]string{hostname}, key)

	// Append to known_hosts file
	f, err := os.OpenFile(knownHostsPath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0600)
	if err != nil {
		return fmt.Errorf("failed to open known_hosts file: %w", err)
	}
	defer f.Close()

	if _, err := f.WriteString(entry + "\n"); err != nil {
		return fmt.Errorf("failed to write to known_hosts file: %w", err)
	}

	slog.Info("added host to known_hosts",
		"host", hostname,
		"fingerprint", ssh.FingerprintSHA256(key),
		"path", knownHostsPath)

	return nil
}
