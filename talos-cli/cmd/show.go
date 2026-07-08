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

var showCmd = &cobra.Command{
	Use:   "show [model]",
	Short: "Show model information",
	Long:  "Display detailed information about an installed model.",
	Args:  cobra.ExactArgs(1),
	RunE:  runShow,
}

type ShowRequest struct {
	Name string `json:"name"`
}

type ShowResponse struct {
	Modelfile  string `json:"modelfile"`
	Parameters string `json:"parameters"`
	Template   string `json:"template"`
	Details    *struct {
		Format            string `json:"format"`
		Family            string `json:"family"`
		ParameterSize     string `json:"parameter_size"`
		QuantizationLevel string `json:"quantization_level"`
	} `json:"details,omitempty"`
}

func runShow(cmd *cobra.Command, args []string) error {
	modelName := args[0]

	resp, err := showViaAPI(modelName)
	if err == nil {
		printShowResponse(resp)
		return nil
	}

	return showLocalModel(modelName)
}

func showViaAPI(name string) (*ShowResponse, error) {
	data, _ := json.Marshal(ShowRequest{Name: name})
	resp, err := http.Post(engineURL+"/api/show", "application/json", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned %d", resp.StatusCode)
	}

	var showResp ShowResponse
	if err := json.NewDecoder(resp.Body).Decode(&showResp); err != nil {
		return nil, err
	}
	return &showResp, nil
}

func printShowResponse(resp *ShowResponse) {
	fmt.Printf("Modelfile:\n  %s\n\n", resp.Modelfile)
	fmt.Printf("Parameters:\n  %s\n", resp.Parameters)
	if resp.Details != nil {
		fmt.Printf("\nDetails:\n")
		fmt.Printf("  Format:     %s\n", resp.Details.Format)
		fmt.Printf("  Family:     %s\n", resp.Details.Family)
		fmt.Printf("  Parameters: %s\n", resp.Details.ParameterSize)
		fmt.Printf("  Quant:      %s\n", resp.Details.QuantizationLevel)
	}
}

func showLocalModel(name string) error {
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
			info, err := entry.Info()
			if err != nil {
				return err
			}
			fullPath := filepath.Join(modelsDir, fileName)

			fmt.Printf("Name:         %s\n", baseName)
			fmt.Printf("File:         %s\n", fileName)
			fmt.Printf("Path:         %s\n", fullPath)
			fmt.Printf("Size:         %s\n", formatSize(info.Size()))
			fmt.Printf("Modified:     %s\n", info.ModTime().Format("2006-01-02 15:04:05"))

			quant := detectQuantization(baseName)
			family := detectFamily(baseName)
			if quant != "" {
				fmt.Printf("Quantization: %s\n", quant)
			}
			if family != "" {
				fmt.Printf("Family:       %s\n", family)
			}
			return nil
		}
	}

	return fmt.Errorf("model '%s' not found", name)
}

func detectQuantization(name string) string {
	lower := strings.ToLower(name)
	quants := []string{"q2_k", "q3_k_s", "q3_k_m", "q3_k_l", "q4_0", "q4_k_s", "q4_k_m", "q5_0", "q5_k_s", "q5_k_m", "q6_k", "q8_0", "iq1", "iq2", "iq3", "iq4", "fp16", "f16", "fp32", "f32"}
	for _, q := range quants {
		if strings.Contains(lower, q) {
			return strings.ToUpper(q)
		}
	}
	return ""
}

func detectFamily(name string) string {
	lower := strings.ToLower(name)
	families := []string{"llama", "mistral", "qwen", "phi", "gemma", "gpt", "bloom",
		"starcoder", "falcon", "yi", "internlm", "deepseek", "command", "dbrx",
		"solar", "openhermes", "neural", "dolphin", "codellama", "openchat", "mixtral"}
	for _, f := range families {
		if strings.Contains(lower, f) {
			return f
		}
	}
	return ""
}
