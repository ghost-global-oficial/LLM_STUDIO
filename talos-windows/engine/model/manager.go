package model

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type ModelInfo struct {
	Name         string            `json:"name"`
	Path         string            `json:"path"`
	Size         int64             `json:"size"`
	ModifiedAt   time.Time         `json:"modified_at"`
	Quantization string            `json:"quantization,omitempty"`
	Family       string            `json:"family,omitempty"`
	Parameters   string            `json:"parameters,omitempty"`
	Template     string            `json:"template,omitempty"`
	License      string            `json:"license,omitempty"`
}

type ModelManager struct {
	modelsDir string
	models    map[string]*ModelInfo
}

func NewModelManager(modelsDir string) *ModelManager {
	os.MkdirAll(modelsDir, 0755)
	mm := &ModelManager{
		modelsDir: modelsDir,
		models:    make(map[string]*ModelInfo),
	}
	mm.scanModels()
	return mm
}

func (mm *ModelManager) scanModels() {
	mm.models = make(map[string]*ModelInfo)

	entries, err := os.ReadDir(mm.modelsDir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".gguf") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		fullPath := filepath.Join(mm.modelsDir, name)
		modelName := strings.TrimSuffix(name, filepath.Ext(name))

		mi := &ModelInfo{
			Name:       modelName,
			Path:       fullPath,
			Size:       info.Size(),
			ModifiedAt: info.ModTime(),
		}
		mm.parseModelName(modelName, mi)
		mm.models[modelName] = mi
	}
}

func (mm *ModelManager) parseModelName(name string, mi *ModelInfo) {
	parts := strings.Split(name, "-")
	for _, part := range parts {
		lower := strings.ToLower(part)
		switch {
		case strings.Contains(lower, "q4_0") || strings.Contains(lower, "q4_1") ||
			strings.Contains(lower, "q4_k") || strings.Contains(lower, "q5_k") ||
			strings.Contains(lower, "q8") || strings.Contains(lower, "q2_k") ||
			strings.Contains(lower, "q3_k") || strings.Contains(lower, "q6_k") ||
			strings.Contains(lower, "iq"):
			mi.Quantization = part
		case strings.Contains(lower, "fp16") || strings.Contains(lower, "f16"):
			mi.Quantization = "FP16"
		case strings.Contains(lower, "fp32") || strings.Contains(lower, "f32"):
			mi.Quantization = "FP32"
		}
	}

	lower := strings.ToLower(name)
	families := []string{"llama", "mistral", "qwen", "phi", "gemma", "gpt", "bloom",
		"starcoder", "falcon", "yi", "internlm", "deepseek", "command", "dbrx",
		"solar", "openhermes", "neural", "dolphin", "codellama", "openchat"}
	for _, f := range families {
		if strings.Contains(lower, f) {
			mi.Family = f
			break
		}
	}
}

func (mm *ModelManager) ListModels() []*ModelInfo {
	mm.scanModels()
	result := make([]*ModelInfo, 0, len(mm.models))
	for _, m := range mm.models {
		result = append(result, m)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ModifiedAt.After(result[j].ModifiedAt)
	})
	return result
}

func (mm *ModelManager) GetModel(name string) (*ModelInfo, bool) {
	mm.scanModels()
	m, ok := mm.models[name]
	return m, ok
}

func (mm *ModelManager) FindModelByPath(path string) *ModelInfo {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil
	}
	for _, m := range mm.models {
		mAbs, _ := filepath.Abs(m.Path)
		if mAbs == absPath {
			return m
		}
	}
	return nil
}

func (mm *ModelManager) DeleteModel(name string) error {
	m, ok := mm.models[name]
	if !ok {
		return fmt.Errorf("model %q not found", name)
	}
	return os.Remove(m.Path)
}

type PullProgress struct {
	Status    string  `json:"status"`
	Digest    string  `json:"digest,omitempty"`
	Total     int64   `json:"total,omitempty"`
	Completed int64   `json:"completed,omitempty"`
	Percent   float64 `json:"percent,omitempty"`
}

func (mm *ModelManager) PullModel(name string, callback func(PullProgress)) error {
	resp, err := http.Get(fmt.Sprintf("https://huggingface.co/api/models/%s", name))
	if err != nil {
		return fmt.Errorf("failed to fetch model info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("model not found on huggingface: %s", name)
	}

	callback(PullProgress{Status: "resolving"})

	return fmt.Errorf("pull not yet implemented - please download GGUF files manually to %s", mm.modelsDir)
}
