package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var rmCmd = &cobra.Command{
	Use:     "rm [model]",
	Aliases: []string{"remove", "delete"},
	Short:   "Remove a local model",
	Long:    "Delete a model from the local models directory or from the running engine.",
	Args:    cobra.ExactArgs(1),
	RunE:    runRm,
}

func runRm(cmd *cobra.Command, args []string) error {
	modelName := args[0]

	if err := deleteViaAPI(modelName); err == nil {
		fmt.Printf("Model '%s' deleted\n", modelName)
		return nil
	}

	return deleteLocalModel(modelName)
}

func deleteViaAPI(name string) error {
	data, _ := json.Marshal(map[string]string{"name": name})
	req, err := http.NewRequest("DELETE", engineURL+"/api/delete", bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("API returned %d", resp.StatusCode)
	}
	return nil
}

func deleteLocalModel(name string) error {
	home, _ := os.UserHomeDir()
	modelsDir := filepath.Join(home, ".talos", "models")

	entries, err := os.ReadDir(modelsDir)
	if err != nil {
		return fmt.Errorf("models directory not found")
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		fileName := entry.Name()
		baseName := strings.TrimSuffix(fileName, filepath.Ext(fileName))
		if strings.EqualFold(baseName, name) || strings.EqualFold(fileName, name) {
			fullPath := filepath.Join(modelsDir, fileName)
			if err := os.Remove(fullPath); err != nil {
				return fmt.Errorf("failed to delete: %w", err)
			}
			fmt.Printf("Model '%s' deleted\n", name)
			return nil
		}
	}

	return fmt.Errorf("model '%s' not found", name)
}
