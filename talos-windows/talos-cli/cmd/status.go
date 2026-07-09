package cmd

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/spf13/cobra"
)

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show engine and system status",
	Long:  "Display current engine status, system info, and model directory.",
	RunE:  runStatus,
}

func runStatus(cmd *cobra.Command, args []string) error {
	fmt.Println("Talos CLI Status")
	fmt.Println("================")
	fmt.Println()
	fmt.Printf("CLI Version:   1.0.0\n")
	fmt.Printf("OS:            %s/%s\n", runtime.GOOS, runtime.GOARCH)
	fmt.Printf("CPUs:          %d\n", runtime.NumCPU())
	fmt.Printf("Go version:    %s\n", runtime.Version())
	fmt.Println()

	home, _ := os.UserHomeDir()
	modelsDir := filepath.Join(home, ".talos", "models")
	fmt.Printf("Models dir:    %s\n", modelsDir)

	if _, err := os.Stat(modelsDir); os.IsNotExist(err) {
		fmt.Println("Models:        (none)")
	} else {
		entries, _ := os.ReadDir(modelsDir)
		count := 0
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".gguf") {
				count++
			}
		}
		fmt.Printf("Models:        %d GGUF file(s)\n", count)
	}
	fmt.Println()

	fmt.Print("Engine API:    ")
	resp, err := http.Get(engineURL + "/api/version")
	if err != nil {
		fmt.Println("Not running")
	} else {
		defer resp.Body.Close()
		var version map[string]string
		json.NewDecoder(resp.Body).Decode(&version)
		fmt.Printf("Running on %s (v%s)\n", engineURL, version["version"])
	}

	return nil
}
