package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"talos-engine/config"
	"talos-engine/llm"
	"talos-engine/model"
)

type Server struct {
	engine *llm.LlamaEngine
	models *model.ModelManager
	config *config.Config
	mux    *http.ServeMux
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   *bool         `json:"stream,omitempty"`
	Options  *Options      `json:"options,omitempty"`
}

type GenerateRequest struct {
	Model    string   `json:"model"`
	Prompt   string   `json:"prompt"`
	Stream   *bool    `json:"stream,omitempty"`
	Options  *Options `json:"options,omitempty"`
}

type Options struct {
	Temperature    *float64 `json:"temperature,omitempty"`
	TopK           *int     `json:"top_k,omitempty"`
	TopP           *float64 `json:"top_p,omitempty"`
	RepeatPenalty  *float64 `json:"repeat_penalty,omitempty"`
	NumPredict     *int     `json:"num_predict,omitempty"`
	Seed           *int     `json:"seed,omitempty"`
}

type ChatResponse struct {
	Model              string        `json:"model"`
	CreatedAt          time.Time     `json:"created_at"`
	Message            ChatMessage   `json:"message"`
	Done               bool          `json:"done"`
	TotalDuration      int64         `json:"total_duration,omitempty"`
	LoadDuration       int64         `json:"load_duration,omitempty"`
	PromptEvalCount    int           `json:"prompt_eval_count,omitempty"`
	PromptEvalDuration int64         `json:"prompt_eval_duration,omitempty"`
	EvalCount          int           `json:"eval_count,omitempty"`
	EvalDuration       int64         `json:"eval_duration,omitempty"`
}

type GenerateResponse struct {
	Model              string   `json:"model"`
	CreatedAt          time.Time `json:"created_at"`
	Response           string   `json:"response"`
	Done               bool     `json:"done"`
	TotalDuration      int64    `json:"total_duration,omitempty"`
	PromptEvalCount    int      `json:"prompt_eval_count,omitempty"`
	EvalCount          int      `json:"eval_count,omitempty"`
}

type TagResponse struct {
	Models []ModelTag `json:"models"`
}

type ModelTag struct {
	Name       string `json:"name"`
	Model      string `json:"model"`
	ModifiedAt time.Time `json:"modified_at"`
	Size       int64  `json:"size"`
	Digest     string `json:"digest"`
	Details    *ModelDetails `json:"details,omitempty"`
}

type ModelDetails struct {
	Format            string `json:"format"`
	Family            string `json:"family"`
	Families          []string `json:"families,omitempty"`
	ParameterSize     string `json:"parameter_size"`
	QuantizationLevel string `json:"quantization_level"`
}

type ShowRequest struct {
	Name string `json:"name"`
}

type ShowResponse struct {
	Modelfile   string `json:"modelfile"`
	Parameters  string `json:"parameters"`
	Template    string `json:"template"`
	Details     *ModelDetails `json:"details"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func NewServer(engine *llm.LlamaEngine, models *model.ModelManager, config *config.Config) *Server {
	s := &Server{
		engine: engine,
		models: models,
		config: config,
		mux:    http.NewServeMux(),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("/api/chat", s.handleChat)
	s.mux.HandleFunc("/api/generate", s.handleGenerate)
	s.mux.HandleFunc("/api/tags", s.handleTags)
	s.mux.HandleFunc("/api/show", s.handleShow)
	s.mux.HandleFunc("/api/pull", s.handlePull)
	s.mux.HandleFunc("/api/delete", s.handleDelete)
	s.mux.HandleFunc("/api/version", s.handleVersion)
	s.mux.HandleFunc("/api/ps", s.handlePs)
	s.mux.HandleFunc("/api/load", s.handleLoad)
	s.mux.HandleFunc("/api/unload", s.handleUnload)
	s.mux.HandleFunc("/", s.handleRoot)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if s.config.Server.APIKey != "" {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") || strings.TrimPrefix(auth, "Bearer ") != s.config.Server.APIKey {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "unauthorized"})
			return
		}
	}

	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"engine":  "talos-engine",
		"version": "1.0.0",
	})
}

func (s *Server) handleVersion(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"version": "1.0.0",
	})
}

func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "method not allowed"})
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	if !s.engine.IsLoaded() {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "no model loaded"})
		return
	}

	prompt := s.buildChatPrompt(req.Messages)

	stream := true
	if req.Stream != nil {
		stream = *req.Stream
	}

	maxTokens := 2048
	if req.Options != nil && req.Options.NumPredict != nil {
		maxTokens = *req.Options.NumPredict
	}

	startTime := time.Now()

	if stream {
		w.Header().Set("Content-Type", "application/x-ndjson")
		w.WriteHeader(http.StatusOK)
		flusher, canFlush := w.(http.Flusher)

		result, err := s.engine.Generate(prompt, maxTokens, func(token string) bool {
			chunk := ChatResponse{
				Model:     req.Model,
				CreatedAt: time.Now(),
				Message:   ChatMessage{Role: "assistant", Content: token},
				Done:      false,
			}
			data, _ := json.Marshal(chunk)
			fmt.Fprintf(w, "%s\n", data)
			if canFlush {
				flusher.Flush()
			}
			return true
		})

		if err != nil {
			log.Printf("[API] Chat error: %v", err)
			return
		}

		done := ChatResponse{
			Model:           req.Model,
			CreatedAt:       time.Now(),
			Message:         ChatMessage{Role: "assistant", Content: ""},
			Done:            true,
			TotalDuration:   time.Since(startTime).Milliseconds(),
			PromptEvalCount: int(result.PromptTokens),
			EvalCount:       int(result.TotalTokens - result.PromptTokens),
		}
		data, _ := json.Marshal(done)
		fmt.Fprintf(w, "%s\n", data)
		if canFlush {
			flusher.Flush()
		}
	} else {
		result, err := s.engine.Generate(prompt, maxTokens, nil)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
			return
		}

		resp := ChatResponse{
			Model:           req.Model,
			CreatedAt:       time.Now(),
			Message:         ChatMessage{Role: "assistant", Content: result.Text},
			Done:            true,
			TotalDuration:   time.Since(startTime).Milliseconds(),
			PromptEvalCount: int(result.PromptTokens),
			EvalCount:       int(result.TotalTokens - result.PromptTokens),
		}
		json.NewEncoder(w).Encode(resp)
	}
}

func (s *Server) buildChatPrompt(messages []ChatMessage) string {
	var sb strings.Builder
	for _, msg := range messages {
		switch msg.Role {
		case "system":
			sb.WriteString(fmt.Sprintf("<|system|>\n%s\n", msg.Content))
		case "user":
			sb.WriteString(fmt.Sprintf("<|user|>\n%s\n", msg.Content))
		case "assistant":
			sb.WriteString(fmt.Sprintf("<|assistant|>\n%s\n", msg.Content))
		default:
			sb.WriteString(fmt.Sprintf("%s: %s\n", msg.Role, msg.Content))
		}
	}
	sb.WriteString("<|assistant|>\n")
	return sb.String()
}

func (s *Server) handleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "method not allowed"})
		return
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	if !s.engine.IsLoaded() {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "no model loaded"})
		return
	}

	stream := true
	if req.Stream != nil {
		stream = *req.Stream
	}

	maxTokens := 2048
	if req.Options != nil && req.Options.NumPredict != nil {
		maxTokens = *req.Options.NumPredict
	}

	startTime := time.Now()

	if stream {
		w.Header().Set("Content-Type", "application/x-ndjson")
		w.WriteHeader(http.StatusOK)
		flusher, canFlush := w.(http.Flusher)

		result, err := s.engine.Generate(req.Prompt, maxTokens, func(token string) bool {
			chunk := GenerateResponse{
				Model:     req.Model,
				CreatedAt: time.Now(),
				Response:  token,
				Done:      false,
			}
			data, _ := json.Marshal(chunk)
			fmt.Fprintf(w, "%s\n", data)
			if canFlush {
				flusher.Flush()
			}
			return true
		})

		if err != nil {
			log.Printf("[API] Generate error: %v", err)
			return
		}

		done := GenerateResponse{
			Model:           req.Model,
			CreatedAt:       time.Now(),
			Response:        "",
			Done:            true,
			TotalDuration:   time.Since(startTime).Milliseconds(),
			PromptEvalCount: int(result.PromptTokens),
			EvalCount:       int(result.TotalTokens - result.PromptTokens),
		}
		data, _ := json.Marshal(done)
		fmt.Fprintf(w, "%s\n", data)
		if canFlush {
			flusher.Flush()
		}
	} else {
		result, err := s.engine.Generate(req.Prompt, maxTokens, nil)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
			return
		}

		resp := GenerateResponse{
			Model:           req.Model,
			CreatedAt:       time.Now(),
			Response:        result.Text,
			Done:            true,
			TotalDuration:   time.Since(startTime).Milliseconds(),
			PromptEvalCount: int(result.PromptTokens),
			EvalCount:       int(result.TotalTokens - result.PromptTokens),
		}
		json.NewEncoder(w).Encode(resp)
	}
}

func (s *Server) handleTags(w http.ResponseWriter, r *http.Request) {
	models := s.models.ListModels()
	tags := make([]ModelTag, 0, len(models))
	for _, m := range models {
		tags = append(tags, ModelTag{
			Name:       m.Name,
			Model:      m.Name,
			ModifiedAt: m.ModifiedAt,
			Size:       m.Size,
			Digest:     "",
			Details: &ModelDetails{
				Format:            "gguf",
				Family:            m.Family,
				ParameterSize:     m.Parameters,
				QuantizationLevel: m.Quantization,
			},
		})
	}
	json.NewEncoder(w).Encode(TagResponse{Models: tags})
}

func (s *Server) handleShow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req ShowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	m, ok := s.models.GetModel(req.Name)
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{Error: fmt.Sprintf("model %q not found", req.Name)})
		return
	}

	resp := ShowResponse{
		Modelfile:  fmt.Sprintf("FROM %s\n", m.Path),
		Parameters: fmt.Sprintf("num_ctx %d\nnum_gpu %d\n", s.config.Model.CTXSize, s.config.Model.NGPULayers),
		Details: &ModelDetails{
			Format:            "gguf",
			Family:            m.Family,
			ParameterSize:     m.Parameters,
			QuantizationLevel: m.Quantization,
		},
	}
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) handlePull(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(ErrorResponse{Error: "pull not implemented yet"})
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	if err := s.models.DeleteModel(req.Name); err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (s *Server) handlePs(w http.ResponseWriter, r *http.Request) {
	if s.engine.IsLoaded() {
		info := s.engine.GetModelInfo()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"models": []map[string]interface{}{
				{
					"name":             info["model_path"],
					"model":            info["model_path"],
					"size":             0,
					"size_vram":        0,
					"digest":           "",
					"expires_at":       time.Now().Add(time.Hour),
					"details":          info,
				},
			},
		})
	} else {
		json.NewEncoder(w).Encode(map[string]interface{}{"models": []interface{}{}})
	}
}

func (s *Server) handleLoad(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "method not allowed"})
		return
	}

	var req struct {
		Path      string `json:"path"`
		ModelPath string `json:"model_path"`
		GpuLayers int    `json:"gpu_layers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	modelPath := req.Path
	if modelPath == "" {
		modelPath = req.ModelPath
	}
	if modelPath == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "model path required"})
		return
	}

	gpuLayers := req.GpuLayers
	if gpuLayers == 0 {
		gpuLayers = s.config.Model.NGPULayers
	}

	if err := s.LoadModelFromFile(modelPath, gpuLayers); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "model loaded"})
}

func (s *Server) handleUnload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	s.UnloadModel()
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "model unloaded"})
}

func (s *Server) LoadModelFromConfig() error {
	if s.config.Model.Path == "" {
		return nil
	}

	log.Printf("[API] Loading model: %s", s.config.Model.Path)
	start := time.Now()

	err := s.engine.LoadModel(llm.EngineConfig{
		ModelPath:    s.config.Model.Path,
		NGPULayers:   s.config.Model.NGPULayers,
		CTXSize:      s.config.Model.CTXSize,
		BatchSize:    s.config.Model.BatchSize,
		UBatchSize:   s.config.Model.UBatchSize,
		Threads:      s.config.Model.Threads,
		ThreadsBatch: s.config.Model.ThreadsBatch,
		UseMMap:      s.config.Model.UseMMap,
		UseMlock:     s.config.Model.UseMlock,
		FlashAttn:    s.config.Model.FlashAttn,
		OffloadKQV:   s.config.Model.OffloadKQV,
		Temperature:  s.config.Sampling.Temperature,
		TopK:         s.config.Sampling.TopK,
		TopP:         s.config.Sampling.TopP,
		RepeatPenalty: s.config.Sampling.RepeatPenalty,
		RepeatLastN:   s.config.Sampling.RepeatLastN,
		Seed:          s.config.Sampling.Seed,
	})

	if err != nil {
		return err
	}

	log.Printf("[API] Model loaded in %v", time.Since(start))
	return nil
}

func (s *Server) LoadModelFromFile(modelPath string, gpuLayers int) error {
	log.Printf("[API] Loading model: %s (gpuLayers=%d)", modelPath, gpuLayers)
	start := time.Now()

	err := s.engine.LoadModel(llm.EngineConfig{
		ModelPath:    modelPath,
		NGPULayers:   gpuLayers,
		CTXSize:      s.config.Model.CTXSize,
		BatchSize:    s.config.Model.BatchSize,
		UBatchSize:   s.config.Model.UBatchSize,
		Threads:      s.config.Model.Threads,
		ThreadsBatch: s.config.Model.ThreadsBatch,
		UseMMap:      s.config.Model.UseMMap,
		UseMlock:     s.config.Model.UseMlock,
		FlashAttn:    s.config.Model.FlashAttn,
		OffloadKQV:   s.config.Model.OffloadKQV,
		Temperature:  s.config.Sampling.Temperature,
		TopK:         s.config.Sampling.TopK,
		TopP:         s.config.Sampling.TopP,
		RepeatPenalty: s.config.Sampling.RepeatPenalty,
		RepeatLastN:   s.config.Sampling.RepeatLastN,
		Seed:          s.config.Sampling.Seed,
	})

	if err != nil {
		return err
	}

	s.config.Model.Path = modelPath
	s.config.Model.NGPULayers = gpuLayers
	log.Printf("[API] Model loaded in %v", time.Since(start))
	return nil
}

func (s *Server) UnloadModel() {
	s.engine.UnloadModel()
}

type ReadCloser struct {
	io.Reader
}

func (rc ReadCloser) Close() error { return nil }
