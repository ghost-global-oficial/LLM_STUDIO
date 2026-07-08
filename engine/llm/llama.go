package llm

/*
#cgo CFLAGS: -IC:/T/talos-windows/node_modules/node-llama-cpp/llama/llama.cpp/include -IC:/T/talos-windows/node_modules/node-llama-cpp/llama/llama.cpp/ggml/include -IC:/T/talos-windows/node_modules/node-llama-cpp/llama/llama.cpp/common
#cgo LDFLAGS: -LC:/T/talos-windows/engine/lib -lllama -lggml -lggml-base -lggml-cpu -lgomp -lm -lstdc++ -lole32 -lws2_32 -lpthread

#include "llama.h"
#include <stdlib.h>
#include <string.h>

static struct llama_model_params make_model_params(int n_gpu_layers, bool use_mmap, bool use_mlock) {
    struct llama_model_params params = llama_model_default_params();
    params.n_gpu_layers = n_gpu_layers;
    params.use_mmap = use_mmap;
    params.use_mlock = use_mlock;
    params.devices = NULL;
    params.tensor_buft_overrides = NULL;
    params.kv_overrides = NULL;
    params.vocab_only = false;
    params.use_direct_io = false;
    params.check_tensors = false;
    params.use_extra_bufts = false;
    params.no_host = false;
    params.no_alloc = false;
    params.progress_callback = NULL;
    params.progress_callback_user_data = NULL;
    params.split_mode = LLAMA_SPLIT_MODE_NONE;
    params.main_gpu = 0;
    params.tensor_split = NULL;
    return params;
}

static struct llama_context_params make_ctx_params(int n_ctx, int n_batch, int n_ubatch, int n_threads, int n_threads_batch, bool flash_attn, bool offload_kqv) {
    struct llama_context_params params = llama_context_default_params();
    params.n_ctx = n_ctx;
    params.n_batch = n_batch;
    params.n_ubatch = n_ubatch;
    params.n_seq_max = 1;
    params.n_threads = n_threads;
    params.n_threads_batch = n_threads_batch;
    params.rope_freq_base = 0;
    params.rope_freq_scale = 0;
    params.yarn_ext_factor = -1;
    params.yarn_attn_factor = 1.0;
    params.yarn_beta_fast = 32.0;
    params.yarn_beta_slow = 1.0;
    params.yarn_orig_ctx = 0;
    params.defrag_thold = -1;
    params.embeddings = false;
    params.offload_kqv = offload_kqv;
    params.no_perf = false;
    params.op_offload = false;
    params.swa_full = true;
    params.kv_unified = true;
    params.flash_attn_type = flash_attn ? LLAMA_FLASH_ATTN_TYPE_ENABLED : LLAMA_FLASH_ATTN_TYPE_DISABLED;
    params.rope_scaling_type = LLAMA_ROPE_TYPE_NONE;
    params.pooling_type = LLAMA_POOLING_TYPE_NONE;
    params.attention_type = LLAMA_ATTENTION_TYPE_CAUSAL;
    params.type_k = GGML_TYPE_F16;
    params.type_v = GGML_TYPE_F16;
    params.cb_eval = NULL;
    params.cb_eval_user_data = NULL;
    params.abort_callback = NULL;
    params.abort_callback_data = NULL;
    params.samplers = NULL;
    params.n_samplers = 0;
    return params;
}
*/
import "C"
import (
	"fmt"
	"sync"
	"unsafe"
)

type LlamaEngine struct {
	mu       sync.Mutex
	model    *C.struct_llama_model
	ctx      *C.struct_llama_context
	vocab    *C.struct_llama_vocab
	config   EngineConfig
	loaded   bool
	modelPath string
}

type EngineConfig struct {
	ModelPath    string
	NGPULayers   int
	CTXSize      int
	BatchSize    int
	UBatchSize   int
	Threads      int
	ThreadsBatch int
	UseMMap      bool
	UseMlock     bool
	FlashAttn    bool
	OffloadKQV   bool
	Temperature  float64
	TopK         int
	TopP         float64
	RepeatPenalty float64
	RepeatLastN   int
	Seed         int
}

type TokenInfo struct {
	TokenID int32
	Text    string
}

type GenerationResult struct {
	Text         string
	Tokens       []int32
	PromptTokens int32
	TotalTokens  int32
}

func init() {
	C.llama_backend_init()
}

func Cleanup() {
	C.llama_backend_free()
}

func NewLlamaEngine() *LlamaEngine {
	return &LlamaEngine{}
}

func (e *LlamaEngine) LoadModel(config EngineConfig) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.loaded {
		e.unloadModelUnsafe()
	}

	cConfig := C.make_model_params(
		C.int(config.NGPULayers),
		C.bool(config.UseMMap),
		C.bool(config.UseMlock),
	)

	cPath := C.CString(config.ModelPath)
	defer C.free(unsafe.Pointer(cPath))

	e.model = C.llama_model_load_from_file(cPath, cConfig)
	if e.model == nil {
		return fmt.Errorf("failed to load model from %s", config.ModelPath)
	}

	ctxConfig := C.make_ctx_params(
		C.int(config.CTXSize),
		C.int(config.BatchSize),
		C.int(config.UBatchSize),
		C.int(config.Threads),
		C.int(config.ThreadsBatch),
		C.bool(config.FlashAttn),
		C.bool(config.OffloadKQV),
	)

	e.ctx = C.llama_init_from_model(e.model, ctxConfig)
	if e.ctx == nil {
		C.llama_model_free(e.model)
		e.model = nil
		return fmt.Errorf("failed to create context")
	}

	e.vocab = C.llama_model_get_vocab(e.model)
	e.config = config
	e.loaded = true
	e.modelPath = config.ModelPath
	return nil
}

func (e *LlamaEngine) UnloadModel() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.unloadModelUnsafe()
}

func (e *LlamaEngine) unloadModelUnsafe() {
	if e.ctx != nil {
		C.llama_free(e.ctx)
		e.ctx = nil
	}
	if e.model != nil {
		C.llama_model_free(e.model)
		e.model = nil
	}
	e.vocab = nil
	e.loaded = false
	e.modelPath = ""
}

func (e *LlamaEngine) IsLoaded() bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.loaded
}

func (e *LlamaEngine) GetModelPath() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.modelPath
}

func (e *LlamaEngine) Tokenize(text string, addSpecial bool) ([]int32, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.loaded {
		return nil, fmt.Errorf("model not loaded")
	}

	cText := C.CString(text)
	defer C.free(unsafe.Pointer(cText))

	nTokens := C.llama_tokenize(e.vocab, cText, C.int(len(text)), nil, 0, C.bool(addSpecial), C.bool(true))
	if nTokens < 0 {
		return nil, fmt.Errorf("tokenization failed")
	}

	tokens := make([]C.llama_token, int(nTokens))
	n := C.llama_tokenize(e.vocab, cText, C.int(len(text)), (*C.llama_token)(unsafe.Pointer(&tokens[0])), nTokens, C.bool(addSpecial), C.bool(true))
	if n < 0 {
		return nil, fmt.Errorf("tokenization failed")
	}

	result := make([]int32, int(n))
	for i := 0; i < int(n); i++ {
		result[i] = int32(tokens[i])
	}
	return result, nil
}

func (e *LlamaEngine) Detokenize(tokens []int32) (string, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.loaded {
		return "", fmt.Errorf("model not loaded")
	}

	cTokens := make([]C.llama_token, len(tokens))
	for i, t := range tokens {
		cTokens[i] = C.llama_token(t)
	}

	bufSize := C.int(len(tokens) * 64)
	buf := C.malloc(C.size_t(bufSize))
	defer C.free(buf)

	n := C.llama_detokenize(e.vocab, (*C.llama_token)(unsafe.Pointer(&cTokens[0])), C.int(len(tokens)), (*C.char)(buf), bufSize, C.bool(false), C.bool(false))
	if n < 0 {
		return "", fmt.Errorf("detokenization failed")
	}

	return C.GoStringN((*C.char)(buf), n), nil
}

func (e *LlamaEngine) Generate(prompt string, maxTokens int, callback func(token string) bool) (*GenerationResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.loaded {
		return nil, fmt.Errorf("model not loaded")
	}

	promptTokens, err := e.tokenizeUnsafe(prompt, true)
	if err != nil {
		return nil, fmt.Errorf("failed to tokenize prompt: %w", err)
	}

	nCtx := int(C.llama_n_ctx(e.ctx))
	if len(promptTokens) >= nCtx {
		return nil, fmt.Errorf("prompt too long: %d tokens > %d context", len(promptTokens), nCtx)
	}

	mem := C.llama_get_memory(e.ctx)
	C.llama_memory_clear(mem, C.bool(true))

	batch := C.llama_batch_get_one((*C.llama_token)(unsafe.Pointer(&promptTokens[0])), C.int(len(promptTokens)))
	ret := C.llama_decode(e.ctx, batch)
	if ret != 0 {
		return nil, fmt.Errorf("decode failed with code %d", ret)
	}

	sparams := C.llama_sampler_chain_default_params()
	smpl := C.llama_sampler_chain_init(sparams)

	if e.config.Temperature > 0 {
		C.llama_sampler_chain_add(smpl, C.llama_sampler_init_top_k(C.int(e.config.TopK)))
		C.llama_sampler_chain_add(smpl, C.llama_sampler_init_top_p(C.float(e.config.TopP), C.size_t(1)))
		C.llama_sampler_chain_add(smpl, C.llama_sampler_init_temp(C.float(e.config.Temperature)))
	}

	seed := C.uint32_t(e.config.Seed)
	if e.config.Seed < 0 {
		seed = C.LLAMA_DEFAULT_SEED
	}
	C.llama_sampler_chain_add(smpl, C.llama_sampler_init_dist(seed))
	defer C.llama_sampler_free(smpl)

	var generated []int32
	pos := len(promptTokens)

	for i := 0; i < maxTokens; i++ {
		token := C.llama_sampler_sample(smpl, e.ctx, -1)

		if C.llama_vocab_is_eog(e.vocab, token) {
			break
		}

			generated = append(generated, int32(token))

		pieceBuf := make([]C.char, 128)
		n := C.llama_token_to_piece(e.vocab, token, (*C.char)(unsafe.Pointer(&pieceBuf[0])), 128, 0, C.bool(true))
		if n > 0 {
			tokenText := C.GoStringN((*C.char)(unsafe.Pointer(&pieceBuf[0])), n)
			if callback != nil {
				if !callback(tokenText) {
					break
				}
			}
		}

		C.llama_sampler_accept(smpl, token)

		nextBatch := C.llama_batch_get_one((*C.llama_token)(unsafe.Pointer(&token)), 1)
		ret = C.llama_decode(e.ctx, nextBatch)
		if ret != 0 {
			break
		}
		pos++
	}

	text, _ := e.detokenizeUnsafe(generated)
	return &GenerationResult{
		Text:         text,
		Tokens:       generated,
		PromptTokens: int32(len(promptTokens)),
		TotalTokens:  int32(len(promptTokens) + len(generated)),
	}, nil
}

func (e *LlamaEngine) tokenizeUnsafe(text string, addSpecial bool) ([]int32, error) {
	cText := C.CString(text)
	defer C.free(unsafe.Pointer(cText))

	nTokens := C.llama_tokenize(e.vocab, cText, C.int(len(text)), nil, 0, C.bool(addSpecial), C.bool(true))
	if nTokens < 0 {
		return nil, fmt.Errorf("tokenization failed")
	}

	tokens := make([]C.llama_token, int(nTokens))
	n := C.llama_tokenize(e.vocab, cText, C.int(len(text)), (*C.llama_token)(unsafe.Pointer(&tokens[0])), nTokens, C.bool(addSpecial), C.bool(true))
	if n < 0 {
		return nil, fmt.Errorf("tokenization failed")
	}

	result := make([]int32, int(n))
	for i := 0; i < int(n); i++ {
		result[i] = int32(tokens[i])
	}
	return result, nil
}

func (e *LlamaEngine) detokenizeUnsafe(tokens []int32) (string, error) {
	if len(tokens) == 0 {
		return "", nil
	}

	cTokens := make([]C.llama_token, len(tokens))
	for i, t := range tokens {
		cTokens[i] = C.llama_token(t)
	}

	bufSize := C.int(len(tokens) * 64)
	buf := C.malloc(C.size_t(bufSize))
	defer C.free(buf)

	n := C.llama_detokenize(e.vocab, (*C.llama_token)(unsafe.Pointer(&cTokens[0])), C.int(len(tokens)), (*C.char)(buf), bufSize, C.bool(false), C.bool(true))
	if n < 0 {
		return "", fmt.Errorf("detokenization failed")
	}

	return C.GoStringN((*C.char)(buf), n), nil
}

func (e *LlamaEngine) GetModelInfo() map[string]interface{} {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.loaded {
		return nil
	}

	vocabSize := int(C.llama_vocab_n_tokens(e.vocab))
	ctxSize := int(C.llama_n_ctx(e.ctx))

	return map[string]interface{}{
		"model_path": e.modelPath,
		"vocab_size": vocabSize,
		"ctx_size":   ctxSize,
		"gpu_layers": e.config.NGPULayers,
		"threads":    e.config.Threads,
		"loaded":     true,
	}
}
