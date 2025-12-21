package debugger

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"sync"
	"sync/atomic"

	"github.com/google/go-dap"
)

// Client is a Debug Adapter Protocol client
type Client struct {
	conn   net.Conn
	reader *bufio.Reader
	writer io.Writer
	mu     sync.Mutex

	seq         int64
	pending     map[int]chan *dap.Response
	pendingMu   sync.Mutex
	initialized bool

	// Event callbacks
	OnStopped    func(event *dap.StoppedEvent)
	OnOutput     func(event *dap.OutputEvent)
	OnTerminated func(event *dap.TerminatedEvent)
	OnBreakpoint func(event *dap.BreakpointEvent)
}

// NewClient creates a new DAP client
func NewClient() *Client {
	return &Client{
		pending: make(map[int]chan *dap.Response),
	}
}

// Connect connects to a debug adapter at the specified address
func (c *Client) Connect(address string) error {
	conn, err := net.Dial("tcp", address)
	if err != nil {
		return fmt.Errorf("failed to connect to debug adapter: %w", err)
	}

	c.conn = conn
	c.reader = bufio.NewReader(conn)
	c.writer = conn

	// Start message reader
	go c.readMessages()

	return nil
}

// Close closes the connection to the debug adapter
func (c *Client) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// Initialize sends the initialize request to the debug adapter
func (c *Client) Initialize() (*dap.InitializeResponse, error) {
	req := &dap.InitializeRequest{
		Request: c.newRequest("initialize"),
		Arguments: dap.InitializeRequestArguments{
			ClientID:                     "caboose-desktop",
			ClientName:                   "Caboose Desktop",
			AdapterID:                    "debug",
			PathFormat:                   "path",
			LinesStartAt1:                true,
			ColumnsStartAt1:              true,
			SupportsVariableType:         true,
			SupportsVariablePaging:       true,
			SupportsRunInTerminalRequest: false,
		},
	}

	resp, err := c.sendRequest(req)
	if err != nil {
		return nil, err
	}

	c.initialized = true
	return resp.(*dap.InitializeResponse), nil
}

// Launch sends a launch request to start debugging
func (c *Client) Launch(args map[string]interface{}) error {
	argsJSON, err := json.Marshal(args)
	if err != nil {
		return fmt.Errorf("failed to marshal launch args: %w", err)
	}

	req := &dap.LaunchRequest{
		Request:   c.newRequest("launch"),
		Arguments: argsJSON,
	}

	_, err = c.sendRequest(req)
	return err
}

// Attach sends an attach request to attach to a running process
func (c *Client) Attach(args map[string]interface{}) error {
	argsJSON, err := json.Marshal(args)
	if err != nil {
		return fmt.Errorf("failed to marshal attach args: %w", err)
	}

	req := &dap.AttachRequest{
		Request:   c.newRequest("attach"),
		Arguments: argsJSON,
	}

	_, err = c.sendRequest(req)
	return err
}

// SetBreakpoints sets breakpoints in a source file
func (c *Client) SetBreakpoints(source string, lines []int) (*dap.SetBreakpointsResponse, error) {
	breakpoints := make([]dap.SourceBreakpoint, len(lines))
	for i, line := range lines {
		breakpoints[i] = dap.SourceBreakpoint{Line: line}
	}

	req := &dap.SetBreakpointsRequest{
		Request: c.newRequest("setBreakpoints"),
		Arguments: dap.SetBreakpointsArguments{
			Source:      dap.Source{Path: source},
			Breakpoints: breakpoints,
		},
	}

	resp, err := c.sendRequest(req)
	if err != nil {
		return nil, err
	}

	return resp.(*dap.SetBreakpointsResponse), nil
}

// Continue resumes execution
func (c *Client) Continue(threadId int) error {
	req := &dap.ContinueRequest{
		Request: c.newRequest("continue"),
		Arguments: dap.ContinueArguments{
			ThreadId: threadId,
		},
	}

	_, err := c.sendRequest(req)
	return err
}

// Next steps over to the next line
func (c *Client) Next(threadId int) error {
	req := &dap.NextRequest{
		Request: c.newRequest("next"),
		Arguments: dap.NextArguments{
			ThreadId: threadId,
		},
	}

	_, err := c.sendRequest(req)
	return err
}

// StepIn steps into a function
func (c *Client) StepIn(threadId int) error {
	req := &dap.StepInRequest{
		Request: c.newRequest("stepIn"),
		Arguments: dap.StepInArguments{
			ThreadId: threadId,
		},
	}

	_, err := c.sendRequest(req)
	return err
}

// StepOut steps out of the current function
func (c *Client) StepOut(threadId int) error {
	req := &dap.StepOutRequest{
		Request: c.newRequest("stepOut"),
		Arguments: dap.StepOutArguments{
			ThreadId: threadId,
		},
	}

	_, err := c.sendRequest(req)
	return err
}

// Pause pauses execution
func (c *Client) Pause(threadId int) error {
	req := &dap.PauseRequest{
		Request: c.newRequest("pause"),
		Arguments: dap.PauseArguments{
			ThreadId: threadId,
		},
	}

	_, err := c.sendRequest(req)
	return err
}

// GetThreads returns all threads
func (c *Client) GetThreads() (*dap.ThreadsResponse, error) {
	req := &dap.ThreadsRequest{
		Request: c.newRequest("threads"),
	}

	resp, err := c.sendRequest(req)
	if err != nil {
		return nil, err
	}

	return resp.(*dap.ThreadsResponse), nil
}

// GetStackTrace returns the stack trace for a thread
func (c *Client) GetStackTrace(threadId int) (*dap.StackTraceResponse, error) {
	req := &dap.StackTraceRequest{
		Request: c.newRequest("stackTrace"),
		Arguments: dap.StackTraceArguments{
			ThreadId: threadId,
		},
	}

	resp, err := c.sendRequest(req)
	if err != nil {
		return nil, err
	}

	return resp.(*dap.StackTraceResponse), nil
}

// GetScopes returns the scopes for a stack frame
func (c *Client) GetScopes(frameId int) (*dap.ScopesResponse, error) {
	req := &dap.ScopesRequest{
		Request: c.newRequest("scopes"),
		Arguments: dap.ScopesArguments{
			FrameId: frameId,
		},
	}

	resp, err := c.sendRequest(req)
	if err != nil {
		return nil, err
	}

	return resp.(*dap.ScopesResponse), nil
}

// GetVariables returns variables for a reference
func (c *Client) GetVariables(variablesRef int) (*dap.VariablesResponse, error) {
	req := &dap.VariablesRequest{
		Request: c.newRequest("variables"),
		Arguments: dap.VariablesArguments{
			VariablesReference: variablesRef,
		},
	}

	resp, err := c.sendRequest(req)
	if err != nil {
		return nil, err
	}

	return resp.(*dap.VariablesResponse), nil
}

// Evaluate evaluates an expression
func (c *Client) Evaluate(expression string, frameId int) (*dap.EvaluateResponse, error) {
	req := &dap.EvaluateRequest{
		Request: c.newRequest("evaluate"),
		Arguments: dap.EvaluateArguments{
			Expression: expression,
			FrameId:    frameId,
			Context:    "watch",
		},
	}

	resp, err := c.sendRequest(req)
	if err != nil {
		return nil, err
	}

	return resp.(*dap.EvaluateResponse), nil
}

// Disconnect disconnects from the debug adapter
func (c *Client) Disconnect(terminateDebuggee bool) error {
	req := &dap.DisconnectRequest{
		Request: c.newRequest("disconnect"),
		Arguments: &dap.DisconnectArguments{
			TerminateDebuggee: terminateDebuggee,
		},
	}

	_, err := c.sendRequest(req)
	return err
}

// newRequest creates a new DAP request
func (c *Client) newRequest(command string) dap.Request {
	seq := atomic.AddInt64(&c.seq, 1)
	return dap.Request{
		ProtocolMessage: dap.ProtocolMessage{
			Seq:  int(seq),
			Type: "request",
		},
		Command: command,
	}
}

// sendRequest sends a request and waits for the response
func (c *Client) sendRequest(req dap.Message) (dap.Message, error) {
	c.mu.Lock()

	// Encode and send
	err := dap.WriteProtocolMessage(c.writer, req)
	if err != nil {
		c.mu.Unlock()
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	c.mu.Unlock()

	// Wait for response
	respChan := make(chan *dap.Response, 1)

	seqNum := 0
	switch r := req.(type) {
	case *dap.InitializeRequest:
		seqNum = r.Seq
	case *dap.LaunchRequest:
		seqNum = r.Seq
	case *dap.AttachRequest:
		seqNum = r.Seq
	case *dap.SetBreakpointsRequest:
		seqNum = r.Seq
	case *dap.ContinueRequest:
		seqNum = r.Seq
	case *dap.NextRequest:
		seqNum = r.Seq
	case *dap.StepInRequest:
		seqNum = r.Seq
	case *dap.StepOutRequest:
		seqNum = r.Seq
	case *dap.PauseRequest:
		seqNum = r.Seq
	case *dap.ThreadsRequest:
		seqNum = r.Seq
	case *dap.StackTraceRequest:
		seqNum = r.Seq
	case *dap.ScopesRequest:
		seqNum = r.Seq
	case *dap.VariablesRequest:
		seqNum = r.Seq
	case *dap.EvaluateRequest:
		seqNum = r.Seq
	case *dap.DisconnectRequest:
		seqNum = r.Seq
	}

	c.pendingMu.Lock()
	c.pending[seqNum] = respChan
	c.pendingMu.Unlock()

	resp := <-respChan

	c.pendingMu.Lock()
	delete(c.pending, seqNum)
	c.pendingMu.Unlock()

	if !resp.Success {
		return nil, fmt.Errorf("request failed: %s", resp.Message)
	}

	return resp, nil
}

// readMessages reads and dispatches DAP messages
func (c *Client) readMessages() {
	for {
		msg, err := dap.ReadProtocolMessage(c.reader)
		if err != nil {
			if err != io.EOF {
				// Log error
			}
			return
		}

		c.handleMessage(msg)
	}
}

// handleMessage dispatches a received message
func (c *Client) handleMessage(msg dap.Message) {
	switch m := msg.(type) {
	case *dap.Response:
		c.pendingMu.Lock()
		if ch, ok := c.pending[m.RequestSeq]; ok {
			ch <- m
		}
		c.pendingMu.Unlock()

	case *dap.StoppedEvent:
		if c.OnStopped != nil {
			c.OnStopped(m)
		}

	case *dap.OutputEvent:
		if c.OnOutput != nil {
			c.OnOutput(m)
		}

	case *dap.TerminatedEvent:
		if c.OnTerminated != nil {
			c.OnTerminated(m)
		}

	case *dap.BreakpointEvent:
		if c.OnBreakpoint != nil {
			c.OnBreakpoint(m)
		}
	}
}

// IsConnected returns whether the client is connected
func (c *Client) IsConnected() bool {
	return c.conn != nil
}

// IsInitialized returns whether the client is initialized
func (c *Client) IsInitialized() bool {
	return c.initialized
}

// DebugState holds the current debug state
type DebugState struct {
	Connected   bool                   `json:"connected"`
	Running     bool                   `json:"running"`
	ThreadId    int                    `json:"threadId"`
	StackFrames []dap.StackFrame       `json:"stackFrames"`
	Variables   map[int][]dap.Variable `json:"variables"`
	Breakpoints map[string][]int       `json:"breakpoints"` // file -> lines
}

// ToJSON serializes the debug state to JSON
func (s *DebugState) ToJSON() ([]byte, error) {
	return json.Marshal(s)
}
