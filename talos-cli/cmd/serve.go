package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/spf13/cobra"
)

var (
	servePort    int
	serveHost    string
	serveModel   string
	serveGPUL    int
	serveAPIKey  string
	serveThreads int
	serveCTX     int
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the Talos API server",
	Long:  "Start the Talos Engine HTTP API server with Ollama-compatible endpoints.",
	RunE:  runServe,
}

func init() {
	serveCmd.Flags().IntVarP(&servePort, "port", "p", 11435, "Server port")
	serveCmd.Flags().StringVar(&serveHost, "host", "127.0.0.1", "Server host")
	serveCmd.Flags().StringVarP(&serveModel, "model", "m", "", "Model to load on startup")
	serveCmd.Flags().IntVarP(&serveGPUL, "gpu-layers", "g", 0, "GPU layers (0=CPU only)")
	serveCmd.Flags().StringVarP(&serveAPIKey, "api-key", "k", "", "API key for authentication")
	serveCmd.Flags().IntVarP(&serveThreads, "threads", "t", 0, "CPU threads (0=auto)")
	serveCmd.Flags().IntVarP(&serveCTX, "ctx-size", "c", 4096, "Context window size")
}

func runServe(cmd *cobra.Command, args []string) error {
	fmt.Println("  ______                _                 _ ")
	fmt.Println(" / _____|              (_)               | |")
	fmt.Println("| (___  _ __ ___   __ _ _ _ __ __ _  ___| |")
	fmt.Println(" \\___ \\| '_ ` _ \\ / _` | | '__/ _` |/ __| |")
	fmt.Println(" ____) | | | | | | (_| | | | | (_| | (__| |")
	fmt.Println("|_____/|_| |_| |_|\\__,_|_|_|  \\__,_|\\___|_|")
	fmt.Println()
	fmt.Println("Talos CLI Engine v1.0.0")
	fmt.Println()

	exePath := findEngine()
	if exePath == "" {
		return fmt.Errorf("talos-engine.exe not found.\nPlace it in the same directory as talos-cli.exe or in PATH")
	}

	fmt.Printf("Engine binary: %s\n", exePath)
	fmt.Printf("Starting server on %s:%d...\n", serveHost, servePort)

	argsList := []string{
		"--port", fmt.Sprintf("%d", servePort),
		"--host", serveHost,
		"--gpu-layers", fmt.Sprintf("%d", serveGPUL),
		"--ctx-size", fmt.Sprintf("%d", serveCTX),
	}
	if serveModel != "" {
		argsList = append(argsList, "--model", serveModel)
	}
	if serveAPIKey != "" {
		argsList = append(argsList, "--api-key", serveAPIKey)
	}
	if serveThreads > 0 {
		argsList = append(argsList, "--threads", fmt.Sprintf("%d", serveThreads))
	}

	proc := exec.Command(exePath, argsList...)
	proc.Stdout = os.Stdout
	proc.Stderr = os.Stderr

	if err := proc.Start(); err != nil {
		return fmt.Errorf("failed to start engine: %w", err)
	}

	fmt.Printf("Engine started (PID: %d)\n", proc.Process.Pid)
	fmt.Println("Press Ctrl+C to stop")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("\nShutting down engine...")
	proc.Process.Signal(syscall.SIGTERM)
	proc.Wait()
	fmt.Println("Engine stopped")
	return nil
}

func findEngine() string {
	exe, _ := os.Executable()
	dir := filepath.Dir(exe)

	locations := []string{
		filepath.Join(dir, "talos-engine.exe"),
		filepath.Join(dir, "..", "engine", "bin", "talos-engine.exe"),
		"C:\\T\\talos-windows\\engine\\bin\\talos-engine.exe",
	}

	for _, loc := range locations {
		if _, err := os.Stat(loc); err == nil {
			return loc
		}
	}

	path, err := exec.LookPath("talos-engine.exe")
	if err == nil {
		return path
	}

	return ""
}
