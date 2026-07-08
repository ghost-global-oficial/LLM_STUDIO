package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"talos-engine/api"
	"talos-engine/config"
	"talos-engine/llm"
	"talos-engine/model"
)

func main() {
	configPath := flag.String("config", "", "Path to config file")
	modelPath := flag.String("model", "", "Model file path to load")
	port := flag.Int("port", 0, "Server port (overrides config)")
	host := flag.String("host", "", "Server host (overrides config)")
	gpuLayers := flag.Int("gpu-layers", -1, "GPU layers (overrides config)")
	serve := flag.Bool("serve", false, "Start HTTP server only")
	flag.Parse()

	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("[TALOS] Engine starting...")

	cfg := config.DefaultConfig()
	if *configPath != "" {
		if err := cfg.Load(*configPath); err != nil {
			log.Printf("[TALOS] Warning: failed to load config: %v", err)
		}
	} else {
		home, _ := os.UserHomeDir()
		defaultConfig := filepath.Join(home, ".talos", "engine.json")
		cfg.Load(defaultConfig)
	}

	if *port > 0 {
		cfg.Server.Port = *port
	}
	if *host != "" {
		cfg.Server.Host = *host
	}
	if *gpuLayers >= 0 {
		cfg.Model.NGPULayers = *gpuLayers
	}
	if *modelPath != "" {
		cfg.Model.Path = *modelPath
	}

	os.MkdirAll(cfg.Paths.ModelsDir, 0755)

	engine := llm.NewLlamaEngine()
	mm := model.NewModelManager(cfg.Paths.ModelsDir)

	srv := api.NewServer(engine, mm, cfg)

	if *serve && cfg.Model.Path == "" {
		log.Printf("[TALOS] Starting API server without model on %s:%d", cfg.Server.Host, cfg.Server.Port)
	} else if cfg.Model.Path != "" {
		if err := srv.LoadModelFromConfig(); err != nil {
			log.Printf("[TALOS] Warning: failed to load model: %v", err)
		}
	}

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      srv,
		ReadTimeout:  300 * time.Second,
		WriteTimeout: 300 * time.Second,
		IdleTimeout:  300 * time.Second,
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("[TALOS] Failed to listen on %s: %v", addr, err)
	}

	log.Printf("[TALOS] Server listening on %s", addr)

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("[TALOS] Server error: %v", err)
		}
	}()

	handleIPC(engine, mm, cfg, srv)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[TALOS] Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	engine.UnloadModel()
	server.Shutdown(ctx)
	llm.Cleanup()
	log.Println("[TALOS] Engine stopped")
}

func handleIPC(engine *llm.LlamaEngine, mm *model.ModelManager, cfg *config.Config, srv *api.Server) {
	scanner := make(chan string, 10)
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := os.Stdin.Read(buf)
			if n > 0 {
				lines := strings.Split(strings.TrimSpace(string(buf[:n])), "\n")
				for _, line := range lines {
					if strings.TrimSpace(line) != "" {
						scanner <- line
					}
				}
			}
			if err != nil {
				break
			}
		}
	}()

	go func() {
		for line := range scanner {
			var cmd struct {
				Action string `json:"action"`
				Model  string `json:"model,omitempty"`
				Path   string `json:"path,omitempty"`
				Params struct {
					NGPULayers int    `json:"n_gpu_layers,omitempty"`
					CTXSize    int    `json:"ctx_size,omitempty"`
					Threads    int    `json:"threads,omitempty"`
					Prompt     string `json:"prompt,omitempty"`
					MaxTokens  int    `json:"max_tokens,omitempty"`
				} `json:"params,omitempty"`
			}

			if err := json.Unmarshal([]byte(line), &cmd); err != nil {
				sendResponse(map[string]interface{}{"error": err.Error()})
				continue
			}

			switch cmd.Action {
			case "load_model":
				loadPath := cmd.Path
				if loadPath == "" {
					loadPath = cmd.Model
				}
				gpuLayers := cmd.Params.NGPULayers
				if gpuLayers == 0 {
					gpuLayers = cfg.Model.NGPULayers
				}
				err := srv.LoadModelFromFile(loadPath, gpuLayers)
				if err != nil {
					sendResponse(map[string]interface{}{"error": err.Error()})
				} else {
					sendResponse(map[string]interface{}{"success": true, "message": "model loaded"})
				}

			case "unload_model":
				engine.UnloadModel()
				sendResponse(map[string]interface{}{"success": true, "message": "model unloaded"})

			case "generate":
				if !engine.IsLoaded() {
					sendResponse(map[string]interface{}{"error": "no model loaded"})
					continue
				}
				maxTokens := cmd.Params.MaxTokens
				if maxTokens == 0 {
					maxTokens = 512
				}
				result, err := engine.Generate(cmd.Params.Prompt, maxTokens, nil)
				if err != nil {
					sendResponse(map[string]interface{}{"error": err.Error()})
				} else {
					sendResponse(map[string]interface{}{
						"response": result.Text,
						"tokens":   result.TotalTokens,
					})
				}

			case "status":
				sendResponse(map[string]interface{}{
					"loaded":     engine.IsLoaded(),
					"model_path": engine.GetModelPath(),
				})

			case "list_models":
				models := mm.ListModels()
				sendResponse(map[string]interface{}{"models": models})

			case "ping":
				sendResponse(map[string]interface{}{"pong": true})

			default:
				sendResponse(map[string]interface{}{"error": "unknown action"})
			}
		}
	}()
}

func sendResponse(data interface{}) {
	jsonBytes, _ := json.Marshal(data)
	fmt.Printf("%s\n", string(jsonBytes))
	os.Stdout.Sync()
}
