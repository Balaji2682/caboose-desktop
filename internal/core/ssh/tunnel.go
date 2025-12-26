package ssh

import (
	"fmt"
	"io"
	"net"

	"github.com/caboose-desktop/internal/models"
)

// CreateLocalTunnel creates a local port forward (local -> remote)
func (s *Session) CreateLocalTunnel(tunnel models.SSHTunnel) error {
	localAddr := fmt.Sprintf("%s:%d", tunnel.LocalHost, tunnel.LocalPort)
	remoteAddr := fmt.Sprintf("%s:%d", tunnel.RemoteHost, tunnel.RemotePort)

	listener, err := net.Listen("tcp", localAddr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", localAddr, err)
	}

	go func() {
		defer listener.Close()
		for {
			localConn, err := listener.Accept()
			if err != nil {
				return
			}

			go func(local net.Conn) {
				defer local.Close()

				// Connect to remote via SSH
				remote, err := s.Client.Dial("tcp", remoteAddr)
				if err != nil {
					return
				}
				defer remote.Close()

				// Bidirectional copy
				done := make(chan struct{}, 2)
				go func() {
					io.Copy(remote, local)
					done <- struct{}{}
				}()
				go func() {
					io.Copy(local, remote)
					done <- struct{}{}
				}()
				<-done
			}(localConn)
		}
	}()

	return nil
}

// CreateDynamicTunnel creates a SOCKS5 proxy
func (s *Session) CreateDynamicTunnel(localHost string, localPort int) error {
	localAddr := fmt.Sprintf("%s:%d", localHost, localPort)
	listener, err := net.Listen("tcp", localAddr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", localAddr, err)
	}

	go func() {
		defer listener.Close()
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			go s.handleSOCKS5(conn)
		}
	}()

	return nil
}

// handleSOCKS5 implements SOCKS5 proxy protocol
func (s *Session) handleSOCKS5(conn net.Conn) {
	defer conn.Close()

	// SOCKS5 handshake
	buf := make([]byte, 256)
	n, err := conn.Read(buf)
	if err != nil || n < 2 || buf[0] != 0x05 {
		return
	}

	// No authentication
	conn.Write([]byte{0x05, 0x00})

	// Read connection request
	n, err = conn.Read(buf)
	if err != nil || n < 7 || buf[0] != 0x05 || buf[1] != 0x01 {
		return
	}

	// Parse address
	var addr string
	switch buf[3] {
	case 0x01: // IPv4
		addr = fmt.Sprintf("%d.%d.%d.%d:%d", buf[4], buf[5], buf[6], buf[7], int(buf[8])<<8|int(buf[9]))
	case 0x03: // Domain name
		addrLen := int(buf[4])
		addr = fmt.Sprintf("%s:%d", string(buf[5:5+addrLen]), int(buf[5+addrLen])<<8|int(buf[6+addrLen]))
	default:
		return
	}

	// Connect via SSH
	remote, err := s.Client.Dial("tcp", addr)
	if err != nil {
		conn.Write([]byte{0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0}) // Connection refused
		return
	}
	defer remote.Close()

	// Success response
	conn.Write([]byte{0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0})

	// Bidirectional copy
	done := make(chan struct{}, 2)
	go func() {
		io.Copy(remote, conn)
		done <- struct{}{}
	}()
	go func() {
		io.Copy(conn, remote)
		done <- struct{}{}
	}()
	<-done
}
