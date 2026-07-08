package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
)

type Config struct {
	Server struct {
		Port     int    `json:"port"`
		Host     string `json:"host"`
		APIKey   string `json:"api_key"`
		LogLevel string `json:"log_level"`
	} `json:"server"`

	Model struct {
		Path       string `json:"path"`
		NGPULayers int    `json:"n_gpu_layers"`
		CTXSize    int    `json:"ctx_size"`
		BatchSize  int    `json:"batch_size"`
		UBatchSize int    `json:"ubatch_size"`
		Threads    int    `json:"threads"`
		ThreadsBatch int  `json:"threads_batch"`
		UseMMap    bool   `json:"use_mmap"`
		UseMlock   bool   `json:"use_mlock"`
		FlashAttn  bool   `json:"flash_attn"`
		OffloadKQV bool   `json:"offload_kqv"`
	} `json:"model"`

	Sampling struct {
		Temperature    float64 `json:"temperature"`
		TopK           int     `json:"top_k"`
		TopP           float64 `json:"top_p"`
		RepeatPenalty  float64 `json:"repeat_penalty"`
		RepeatLastN    int     `json:"repeat_last_n"`
		FrequencyPenalty float64 `json:"frequency_penalty"`
		PresencePenalty  float64 `json:"presence_penalty"`
		Seed           int     `json:"seed"`
	} `json:"sampling"`

	Paths struct {
		ModelsDir string `json:"models_dir"`
		CacheDir  string `json:"cache_dir"`
	} `json:"paths"`
}

func DefaultConfig() *Config {
	c := &Config{}
	c.Server.Port = 11435
	c.Server.Host = "127.0.0.1"
	c.Server.APIKey = ""
	c.Server.LogLevel = "info"

	c.Model.NGPULayers = 0
	c.Model.CTXSize = 4096
	c.Model.BatchSize = 512
	c.Model.UBatchSize = 512
	c.Model.Threads = runtime.NumCPU()
	c.Model.ThreadsBatch = runtime.NumCPU()
	c.Model.UseMMap = true
	c.Model.UseMlock = false
	c.Model.FlashAttn = false
	c.Model.OffloadKQV = false

	c.Sampling.Temperature = 0.8
	c.Sampling.TopK = 40
	c.Sampling.TopP = 0.95
	c.Sampling.RepeatPenalty = 1.1
	c.Sampling.RepeatLastN = 64
	c.Sampling.FrequencyPenalty = 0.0
	c.Sampling.PresencePenalty = 0.0
	c.Sampling.Seed = -1

	home, _ := os.UserHomeDir()
	c.Paths.ModelsDir = filepath.Join(home, ".talos", "models")
	c.Paths.CacheDir = filepath.Join(home, ".talos", "cache")
	return c
}

func (c *Config) Load(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return c.Save(path)
		}
		return err
	}
	return json.Unmarshal(data, c)
}

func (c *Config) Save(path string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
