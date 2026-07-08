package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var pullOutputDir string

var pullCmd = &cobra.Command{
	Use:   "pull [model]",
	Short: "Download a model from HuggingFace",
	Long:  "Download a GGUF model from HuggingFace Hub.\nSupports full repo names like 'TheBloke/Llama-2-7B-GGUF' or shortcuts.",
	Args:  cobra.ExactArgs(1),
	RunE:  runPull,
}

func init() {
	pullCmd.Flags().StringVarP(&pullOutputDir, "output", "o", "", "Output directory (default: ~/.talos/models)")
}

type HFModelInfo struct {
	ID       string `json:"id"`
	Siblings []struct {
		RFilename string `json:"rfilename"`
		Size      int64  `json:"size"`
	} `json:"siblings"`
}

func runPull(cmd *cobra.Command, args []string) error {
	modelName := args[0]

	outputDir := pullOutputDir
	if outputDir == "" {
		home, _ := os.UserHomeDir()
		outputDir = filepath.Join(home, ".talos", "models")
	}
	os.MkdirAll(outputDir, 0755)

	fmt.Printf("Resolving model: %s\n", modelName)

	apiURL := fmt.Sprintf("https://huggingface.co/api/models/%s", modelName)
	resp, err := http.Get(apiURL)
	if err != nil {
		return fmt.Errorf("failed to fetch model info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("model not found: %s (HTTP %d)", modelName, resp.StatusCode)
	}

	var info HFModelInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return fmt.Errorf("failed to parse model info: %w", err)
	}

	var ggufFiles []struct {
		Path string
		Size int64
		URL  string
	}
	for _, s := range info.Siblings {
		if strings.HasSuffix(strings.ToLower(s.RFilename), ".gguf") {
			ggufFiles = append(ggufFiles, struct {
				Path string
				Size int64
				URL  string
			}{
				Path: s.RFilename,
				Size: s.Size,
				URL:  fmt.Sprintf("https://huggingface.co/%s/resolve/main/%s", modelName, s.RFilename),
			})
		}
	}

	if len(ggufFiles) == 0 {
		return fmt.Errorf("no GGUF files found in %s", modelName)
	}

	fmt.Printf("Found %d GGUF file(s):\n", len(ggufFiles))
	for _, f := range ggufFiles {
		fmt.Printf("  - %s (%s)\n", f.Path, formatSize(f.Size))
	}

	for _, f := range ggufFiles {
		fmt.Printf("\nDownloading %s...\n", f.Path)
		destPath := filepath.Join(outputDir, f.Path)

		if err := downloadFile(f.URL, destPath, f.Size); err != nil {
			return fmt.Errorf("failed to download %s: %w", f.Path, err)
		}
		fmt.Printf("Saved to %s\n", destPath)
	}

	fmt.Printf("\nDone! Model saved to %s\n", outputDir)
	return nil
}

func downloadFile(url, destPath string, totalSize int64) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("download failed: HTTP %d", resp.StatusCode)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	var downloaded int64
	buf := make([]byte, 32*1024)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := out.Write(buf[:n]); writeErr != nil {
				return writeErr
			}
			downloaded += int64(n)
			if totalSize > 0 {
				pct := float64(downloaded) / float64(totalSize) * 100
				fmt.Printf("\r  %.1f%% (%s / %s)", pct, formatSize(downloaded), formatSize(totalSize))
			} else {
				fmt.Printf("\r  %s downloaded", formatSize(downloaded))
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			return readErr
		}
	}
	fmt.Println()
	return nil
}

func formatSize(bytes int64) string {
	const (
		KB = 1024
		MB = 1024 * KB
		GB = 1024 * MB
	)
	switch {
	case bytes >= GB:
		return fmt.Sprintf("%.1f GB", float64(bytes)/float64(GB))
	case bytes >= MB:
		return fmt.Sprintf("%.1f MB", float64(bytes)/float64(MB))
	case bytes >= KB:
		return fmt.Sprintf("%.1f KB", float64(bytes)/float64(KB))
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}
