package cmd

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"text/tabwriter"

	"github.com/spf13/cobra"
)

var listCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List installed models",
	Long:    "List all GGUF models. Queries the running engine API if available, otherwise scans local directory.",
	RunE:    runList,
}

func runList(cmd *cobra.Command, args []string) error {
	models, err := fetchModelsFromAPI()
	if err == nil && len(models) > 0 {
		printModelTable(models)
		return nil
	}

	return listLocalModels()
}

type TagResponse struct {
	Models []struct {
		Name       string `json:"name"`
		Size       int64  `json:"size"`
		ModifiedAt string `json:"modified_at"`
		Details    *struct {
			Format        string `json:"format"`
			Family        string `json:"family"`
			ParameterSize string `json:"parameter_size"`
		} `json:"details,omitempty"`
	} `json:"models"`
}

func fetchModelsFromAPI() ([]struct {
	Name   string
	Size   int64
	Family string
}, error) {
	resp, err := http.Get(engineURL + "/api/tags")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned %d", resp.StatusCode)
	}

	var tagResp TagResponse
	if err := json.NewDecoder(resp.Body).Decode(&tagResp); err != nil {
		return nil, err
	}

	var models []struct {
		Name   string
		Size   int64
		Family string
	}
	for _, m := range tagResp.Models {
		family := ""
		if m.Details != nil {
			family = m.Details.Family
		}
		models = append(models, struct {
			Name   string
			Size   int64
			Family string
		}{Name: m.Name, Size: m.Size, Family: family})
	}
	return models, nil
}

func printModelTable(models []struct {
	Name   string
	Size   int64
	Family string
}) {
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tSIZE\tFAMILY")
	for _, m := range models {
		family := m.Family
		if family == "" {
			family = "-"
		}
		fmt.Fprintf(w, "%s\t%s\t%s\n", m.Name, formatSize(m.Size), family)
	}
	w.Flush()
	fmt.Printf("\n%d model(s)\n", len(models))
}

func listLocalModels() error {
	home, _ := os.UserHomeDir()
	modelsDir := filepath.Join(home, ".talos", "models")

	entries, err := os.ReadDir(modelsDir)
	if err != nil {
		fmt.Println("No models found. Use 'talos-cli pull' to download models.")
		return nil
	}

	type modelEntry struct {
		Name string
		Size int64
	}

	var models []modelEntry
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".gguf") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		models = append(models, modelEntry{
			Name: strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name())),
			Size: info.Size(),
		})
	}

	if len(models) == 0 {
		fmt.Println("No models found. Use 'talos-cli pull' to download models.")
		return nil
	}

	sort.Slice(models, func(i, j int) bool {
		return models[i].Name < models[j].Name
	})

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tSIZE")
	for _, m := range models {
		fmt.Fprintf(w, "%s\t%s\n", m.Name, formatSize(m.Size))
	}
	w.Flush()
	fmt.Printf("\n%d model(s) found\n", len(models))
	return nil
}
