export interface AIModel {
  id: string;
  name: string;
  size: string;
  downloadUrl: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  // --- POPULARES E RECOMENDADOS (EQUILÍBRIO) ---
  { id: 'llama-3.2-1b', name: 'Llama 3.2 1B Instruct (Q4_K_M)', size: '0.8 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B Instruct (Q4_K_M)', size: '2.1 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'gemma-2-2b-it', name: 'Gemma 2 2B Instruct (Q4_K_M)', size: '1.6 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf?download=true' },
  { id: 'qwen-2.5-1.5b', name: 'Qwen 2.5 1.5B Instruct (Q4_K_M)', size: '1.1 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf?download=true' },

  // --- MODELOS DE ALTA PERFORMANCE (PESADOS) ---
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B Instruct (Q4_K_M)', size: '4.9 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'mistral-nemo-12b', name: 'Mistral NeMo 12B Instruct (Q4_K_M)', size: '7.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Mistral-Nemo-Instruct-2407-GGUF/resolve/main/Mistral-Nemo-Instruct-2407-Q4_K_M.gguf?download=true' },
  { id: 'phi-3.5-mini', name: 'Phi-3.5 Mini Instruct (Q4_K_M)', size: '2.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf?download=true' },

  // --- LEVES E RÁPIDOS (OTIMIZADOS PARA CELULAR) ---
  { id: 'qwen-2.5-0.5b', name: 'Qwen 2.5 0.5B Instruct (Q4_K_M)', size: '0.4 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'smollm-135m', name: 'SmolLM 135M Instruct (Q4_K_M)', size: '0.1 GB', downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM-135M-Instruct-GGUF/resolve/main/smollm-135m-instruct-q4_k_m.gguf?download=true' },
  { id: 'smollm-360m', name: 'SmolLM 360M Instruct (Q4_K_M)', size: '0.3 GB', downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM-360M-Instruct-GGUF/resolve/main/smollm-360m-instruct-q4_k_m.gguf?download=true' },
  { id: 'tinyllama-1.1b', name: 'TinyLlama 1.1B Chat (Q4_K_M)', size: '0.7 GB', downloadUrl: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf?download=true' },

  // --- PROGRAMAÇÃO E CÓDIGO ---
  { id: 'deepseek-coder-1.3b', name: 'DeepSeek Coder 1.3B (Q4_K_M)', size: '0.9 GB', downloadUrl: 'https://huggingface.co/TheBloke/deepseek-coder-1.3B-instruct-GGUF/resolve/main/deepseek-coder-1.3b-instruct.Q4_K_M.gguf?download=true' },
  { id: 'qwen-2.5-coder-1.5b', name: 'Qwen 2.5 Coder 1.5B (Q4_K_M)', size: '1.1 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1_5b-instruct-q4_k_m.gguf?download=true' },
  { id: 'stable-code-3b', name: 'Stable Code 3B (Q4_K_M)', size: '1.8 GB', downloadUrl: 'https://huggingface.co/TheBloke/stable-code-3b-GGUF/resolve/main/stable-code-3b.Q4_K_M.gguf?download=true' },

  // --- PENSAMENTO LÓGICO / RACIOCÍNIO ---
  { id: 'deepseek-v2-lite', name: 'DeepSeek V2 Lite (Q4_K_M)', size: '10.2 GB', downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-V2-Lite-Chat-GGUF/resolve/main/DeepSeek-V2-Lite-Chat-Q4_K_M.gguf?download=true' },
  { id: 'nemotron-mini-4b', name: 'Nemotron Mini 4B Instruct (Q4_K_M)', size: '2.8 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Nemotron-Mini-4B-Instruct-GGUF/resolve/main/Nemotron-Mini-4B-Instruct-Q4_K_M.gguf?download=true' },

  // --- MULTILINGUAL E OUTROS ---
  { id: 'aya-23-8b', name: 'Aya 23 8B (Cohere) (Q4_K_M)', size: '5.1 GB', downloadUrl: 'https://huggingface.co/bartowski/aya-23-8B-GGUF/resolve/main/aya-23-8B-Q4_K_M.gguf?download=true' },
  { id: 'internlm2_5-7b', name: 'InternLM 2.5 7B Chat (Q4_K_M)', size: '4.8 GB', downloadUrl: 'https://huggingface.co/internlm/internlm2_5-7b-chat-gguf/resolve/main/internlm2_5-7b-chat-q4_k_m.gguf?download=true' },
  { id: 'reka-flash-21b', name: 'Reka Flash 21B (Q4_K_M)', size: '12.5 GB', downloadUrl: 'https://huggingface.co/bartowski/Reka-Flash-GGUF/resolve/main/Reka-Flash-Q4_K_M.gguf?download=true' },

  // --- LLAMA 3.1 SERIES ---
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B Instruct (Q4_K_M)', size: '42.0 GB', downloadUrl: 'https://huggingface.co/bartowski/Meta-Llama-3.1-70B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-70B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'llama-3.1-nemo-12b', name: 'Llama 3.1 Nemotron 12B (Q4_K_M)', size: '7.2 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.1-Nemotron-12B-Instruct-GGUF/resolve/main/Llama-3.1-Nemotron-12B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'llama-3.1-8b-inst', name: 'Llama 3.1 8B Instruct (Q8_0)', size: '9.0 GB', downloadUrl: 'https://huggingface.co/TheBloke/Llama-3.1-8B-Instruct-GGUF/resolve/main/Llama-3.1-8B-Instruct-Q8_0.gguf?download=true' },

  // --- LLAMA 3 SERIES ---
  { id: 'llama-3-8b', name: 'Llama 3 8B Instruct (Q4_K_M)', size: '4.9 GB', downloadUrl: 'https://huggingface.co/QuantFactory/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/Meta-Llama-3-8B-Instruct.Q4_K_M.gguf?download=true' },
  { id: 'llama-3-70b', name: 'Llama 3 70B Instruct (Q4_K_M)', size: '40.0 GB', downloadUrl: 'https://huggingface.co/QuantFactory/Meta-Llama-3-70B-Instruct-GGUF/resolve/main/Meta-Llama-3-70B-Instruct.Q4_K_M.gguf?download=true' },

  // --- MISTRAL SERIES ---
  { id: 'mistral-7b-inst', name: 'Mistral 7B Instruct (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf?download=true' },
  { id: 'mistral-7b-openorca', name: 'Mistral 7B OpenOrca (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Mistral-7B-OpenOrca-GGUF/resolve/main/mistral-7b-openorca.Q4_K_M.gguf?download=true' },
  { id: 'mistral-7b-math', name: 'Mistral 7B Math (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Mistral-7B-Math-Instruct-GGUF/resolve/main/mistral-7b-math-instruct.Q4_K_M.gguf?download=true' },
  { id: 'mistral-small-7b', name: 'Mistral Small 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Mistral-Small-7B-Instruct-v1-GGUF/resolve/main/mistral-small-7b-instruct-v1.Q4_K_M.gguf?download=true' },
  { id: 'mixtral-8x7b', name: 'Mixtral 8x7B Instruct (Q4_K_M)', size: '26.0 GB', downloadUrl: 'https://huggingface.co/TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF/resolve/main/mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf?download=true' },
  { id: 'mixtral-8x22b', name: 'Mixtral 8x22B Instruct (Q4_K_M)', size: '88.0 GB', downloadUrl: 'https://huggingface.co/TheBloke/Mixtral-8x22B-Instruct-v0.1-GGUF/resolve/main/mixtral-8x22b-instruct-v0.1.Q4_K_M.gguf?download=true' },
  { id: 'mistral-large-123b', name: 'Mistral Large 123B (Q4_K_M)', size: '74.0 GB', downloadUrl: 'https://huggingface.co/bartowski/Mistral-Large-Instruct-2411-GGUF/resolve/main/Mistral-Large-Instruct-2411-Q4_K_M.gguf?download=true' },
  { id: 'codestral-mamba-7b', name: 'Codestral Mamba 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Codestral-7B-v0.1-GGUF/resolve/main/codestral-7b-v0.1.Q4_K_M.gguf?download=true' },

  // --- MICROSOFT PHI SERIES ---
  { id: 'phi-3-mini-3.8b', name: 'Phi-3 Mini 3.8B Instruct (Q4_K_M)', size: '2.4 GB', downloadUrl: 'https://huggingface.co/Microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/phi-3-mini-4k-instruct-q4_k_m.gguf?download=true' },
  { id: 'phi-3-small-7b', name: 'Phi-3 Small 7B Instruct (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Phi-3-small-7b-instruct-GGUF/resolve/main/Phi-3-small-7b-instruct-q4_k_m.gguf?download=true' },
  { id: 'phi-3-medium-14b', name: 'Phi-3 Medium 14B Instruct (Q4_K_M)', size: '8.6 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Phi-3-medium-4k-instruct-GGUF/resolve/main/Phi-3-medium-4k-instruct-q4_k_m.gguf?download=true' },
  { id: 'phi-4-14b', name: 'Phi-4 14B Instruct (Q4_K_M)', size: '8.6 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/phi-4-GGUF/resolve/main/phi-4-q4_k_m.gguf?download=true' },
  { id: 'phi-4-mini-3.8b', name: 'Phi-4 Mini 3.8B Instruct (Q4_K_M)', size: '2.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/phi-4-mini-GGUF/resolve/main/phi-4-mini-q4_k_m.gguf?download=true' },

  // --- QWEN SERIES ---
  { id: 'qwen-2.5-3b', name: 'Qwen 2.5 3B Instruct (Q4_K_M)', size: '2.0 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-7b', name: 'Qwen 2.5 7B Instruct (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-14b', name: 'Qwen 2.5 14B Instruct (Q4_K_M)', size: '8.9 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B Instruct (Q4_K_M)', size: '19.5 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-32B-Instruct-GGUF/resolve/main/qwen2.5-32b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B Instruct (Q4_K_M)', size: '43.0 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-72B-Instruct-GGUF/resolve/main/qwen2.5-72b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-coder-7b', name: 'Qwen 2.5 Coder 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-coder-14b', name: 'Qwen 2.5 Coder 14B (Q4_K_M)', size: '8.9 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct-GGUF/resolve/main/qwen2.5-coder-14b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B (Q4_K_M)', size: '19.5 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/qwen2.5-coder-32b-instruct-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-math-7b', name: 'Qwen 2.5 Math 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Qwen2.5-Math-7B-Instruct-GGUF/resolve/main/Qwen2.5-Math-7B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'qwen-2.5-math-72b', name: 'Qwen 2.5 Math 72B (Q4_K_M)', size: '43.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Qwen2.5-Math-72B-Instruct-GGUF/resolve/main/Qwen2.5-Math-72B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'qwen-2.5-1.5b-inst', name: 'Qwen 2.5 1.5B Instruct (Q8_0)', size: '1.7 GB', downloadUrl: 'https://huggingface.co/ysn-rfd/Qwen2.5-1.5B-Instruct-Q8_0-GGUF/resolve/main/qwen2.5-1.5b-instruct-q8_0.gguf?download=true' },
  { id: 'qwen-2.5-7b-inst', name: 'Qwen 2.5 7B Instruct (Q8_0)', size: '8.1 GB', downloadUrl: 'https://huggingface.co/paultimothymooney/Qwen2.5-7B-Instruct-Q8_0-GGUF/resolve/main/qwen2.5-7b-instruct-q8_0.gguf?download=true' },
  { id: 'qwen-2-72b', name: 'Qwen 2 72B (Q4_K_M)', size: '43.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Qwen2-72B-GGUF/resolve/main/qwen2-72b-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-3b-inst', name: 'Qwen 2.5 3B Instruct (Q8_0)', size: '3.7 GB', downloadUrl: 'https://huggingface.co/ijohn07/Qwen2.5-3B-Instruct-Q8_0-GGUF/resolve/main/qwen2.5-3b-instruct-q8_0.gguf?download=true' },

  // --- GEMMA SERIES ---
  { id: 'gemma-2-9b-it', name: 'Gemma 2 9B Instruct (Q4_K_M)', size: '5.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-q4_k_m.gguf?download=true' },
  { id: 'gemma-2-27b-it', name: 'Gemma 2 27B Instruct (Q4_K_M)', size: '16.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-2-27b-it-GGUF/resolve/main/gemma-2-27b-it-q4_k_m.gguf?download=true' },
  { id: 'gemma-2-2b-it-pt', name: 'Gemma 2 2B Instruct PT (Q4_K_M)', size: '1.6 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-2-2b-it-portuguese-GGUF/resolve/main/gemma-2-2b-it-portuguese-q4_k_m.gguf?download=true' },
  { id: 'gemma-3-4b-it', name: 'Gemma 3 4B Instruct (Q4_K_M)', size: '2.7 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf?download=true' },
  { id: 'gemma-3-12b-it', name: 'Gemma 3 12B Instruct (Q4_K_M)', size: '7.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-3-12b-it-GGUF/resolve/main/gemma-3-12b-it-Q4_K_M.gguf?download=true' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27B Instruct (Q4_K_M)', size: '16.8 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-3-27b-it-GGUF/resolve/main/gemma-3-27b-it-Q4_K_M.gguf?download=true' },
  { id: 'gemma-3-4b-it-q8', name: 'Gemma 3 4B Instruct (Q8_0)', size: '5.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q8_0.gguf?download=true' },

  // --- DEEPSEEK SERIES ---
  { id: 'deepseek-llm-7b', name: 'DeepSeek LLM 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/deepseek-llm-7b-base-GGUF/resolve/main/deepseek-llm-7b-base.q4_k_m.gguf?download=true' },
  { id: 'deepseek-llm-67b', name: 'DeepSeek LLM 67B (Q4_K_M)', size: '40.0 GB', downloadUrl: 'https://huggingface.co/TheBloke/deepseek-llm-67b-base-GGUF/resolve/main/deepseek-llm-67b-base.q4_k_m.gguf?download=true' },
  { id: 'deepseek-coder-6.7b', name: 'DeepSeek Coder 6.7B (Q4_K_M)', size: '4.1 GB', downloadUrl: 'https://huggingface.co/TheBloke/deepseek-coder-6.7b-instruct-GGUF/resolve/main/deepseek-coder-6.7b-instruct.q4_k_m.gguf?download=true' },
  { id: 'deepseek-coder-33b', name: 'DeepSeek Coder 33B (Q4_K_M)', size: '19.5 GB', downloadUrl: 'https://huggingface.co/TheBloke/deepseek-coder-33b-instruct-GGUF/resolve/main/deepseek-coder-33b-instruct.q4_k_m.gguf?download=true' },
  { id: 'deepseek-v2.5-36b', name: 'DeepSeek V2.5 36B (Q4_K_M)', size: '22.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/DeepSeek-V2.5-36B-GGUF/resolve/main/deepseek-v2.5-36b-q4_k_m.gguf?download=true' },
  { id: 'deepseek-r1-1.5b', name: 'DeepSeek R1 1.5B (Q4_K_M)', size: '1.1 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf?download=true' },
  { id: 'deepseek-r1-7b', name: 'DeepSeek R1 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/DeepSeek-R1-Distill-Qwen-7B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf?download=true' },
  { id: 'deepseek-r1-14b', name: 'DeepSeek R1 14B (Q4_K_M)', size: '8.9 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/DeepSeek-R1-Distill-Qwen-14B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf?download=true' },
  { id: 'deepseek-r1-32b', name: 'DeepSeek R1 32B (Q4_K_M)', size: '19.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/DeepSeek-R1-Distill-Qwen-32B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-32B-Q4_K_M.gguf?download=true' },
  { id: 'deepseek-r1-70b', name: 'DeepSeek R1 70B (Q4_K_M)', size: '42.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/DeepSeek-R1-Distill-Llama-70B-GGUF/resolve/main/DeepSeek-R1-Distill-Llama-70B-Q4_K_M.gguf?download=true' },

  // --- STARCODER / CODELLAMA SERIES ---
  { id: 'codellama-7b', name: 'CodeLlama 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.q4_k_m.gguf?download=true' },
  { id: 'codellama-13b', name: 'CodeLlama 13B (Q4_K_M)', size: '8.1 GB', downloadUrl: 'https://huggingface.co/TheBloke/CodeLlama-13B-Instruct-GGUF/resolve/main/codellama-13b-instruct.q4_k_m.gguf?download=true' },
  { id: 'codellama-34b', name: 'CodeLlama 34B (Q4_K_M)', size: '20.5 GB', downloadUrl: 'https://huggingface.co/TheBloke/CodeLlama-34B-Instruct-GGUF/resolve/main/codellama-34b-instruct.q4_k_m.gguf?download=true' },
  { id: 'codellama-70b', name: 'CodeLlama 70B (Q4_K_M)', size: '42.0 GB', downloadUrl: 'https://huggingface.co/TheBloke/CodeLlama-70B-Instruct-GGUF/resolve/main/codellama-70b-instruct.q4_k_m.gguf?download=true' },
  { id: 'starcoder2-3b', name: 'StarCoder2 3B (Q4_K_M)', size: '2.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/starcoder2-3b-GGUF/resolve/main/starcoder2-3b-q4_k_m.gguf?download=true' },
  { id: 'starcoder2-7b', name: 'StarCoder2 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/starcoder2-7b-GGUF/resolve/main/starcoder2-7b-q4_k_m.gguf?download=true' },
  { id: 'starcoder2-15b', name: 'StarCoder2 15B (Q4_K_M)', size: '9.2 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/starcoder2-15b-GGUF/resolve/main/starcoder2-15b-q4_k_m.gguf?download=true' },

  // --- YI SERIES ---
  { id: 'yi-1.5-6b', name: 'Yi 1.5 6B Chat (Q4_K_M)', size: '3.8 GB', downloadUrl: 'https://huggingface.co/TheBloke/Yi-1.5-6B-Chat-GGUF/resolve/main/yi-1.5-6b-chat.q4_k_m.gguf?download=true' },
  { id: 'yi-1.5-9b', name: 'Yi 1.5 9B Chat (Q4_K_M)', size: '5.5 GB', downloadUrl: 'https://huggingface.co/TheBloke/Yi-1.5-9B-Chat-GGUF/resolve/main/yi-1.5-9b-chat.q4_k_m.gguf?download=true' },
  { id: 'yi-1.5-14b', name: 'Yi 1.5 14B Chat (Q4_K_M)', size: '8.9 GB', downloadUrl: 'https://huggingface.co/TheBloke/Yi-1.5-14B-Chat-GGUF/resolve/main/yi-1.5-14b-chat.q4_k_m.gguf?download=true' },
  { id: 'yi-1.5-34b', name: 'Yi 1.5 34B Chat (Q4_K_M)', size: '20.5 GB', downloadUrl: 'https://huggingface.co/TheBloke/Yi-1.5-34B-Chat-GGUF/resolve/main/yi-1.5-34b-chat.q4_k_m.gguf?download=true' },

  // --- FALCON SERIES ---
  { id: 'falcon-7b', name: 'Falcon 7B Instruct (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/falcon-7b-instruct-GGUF/resolve/main/falcon-7b-instruct.q4_k_m.gguf?download=true' },
  { id: 'falcon-40b', name: 'Falcon 40B Instruct (Q4_K_M)', size: '24.0 GB', downloadUrl: 'https://huggingface.co/TheBloke/falcon-40b-instruct-GGUF/resolve/main/falcon-40b-instruct.q4_k_m.gguf?download=true' },
  { id: 'falcon3-1b', name: 'Falcon 3 1B (Q4_K_M)', size: '0.7 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Falcon3-1B-GGUF/resolve/main/falcon3-1b-q4_k_m.gguf?download=true' },
  { id: 'falcon3-3b', name: 'Falcon 3 3B (Q4_K_M)', size: '2.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Falcon3-3B-GGUF/resolve/main/falcon3-3b-q4_k_m.gguf?download=true' },
  { id: 'falcon3-7b', name: 'Falcon 3 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Falcon3-7B-GGUF/resolve/main/falcon3-7b-q4_k_m.gguf?download=true' },
  { id: 'falcon3-10b', name: 'Falcon 3 10B (Q4_K_M)', size: '6.2 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Falcon3-10B-GGUF/resolve/main/falcon3-10b-q4_k_m.gguf?download=true' },

  // --- STABLELM SERIES ---
  { id: 'stablelm-2-1.6b', name: 'StableLM 2 1.6B (Q4_K_M)', size: '1.1 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/stablelm-2-1_6b-GGUF/resolve/main/stablelm-2-1_6b-q4_k_m.gguf?download=true' },
  { id: 'stablelm-2-12b', name: 'StableLM 2 12B (Q4_K_M)', size: '7.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/stablelm-2-12b-GGUF/resolve/main/stablelm-2-12b-q4_k_m.gguf?download=true' },
  { id: 'stablelm-3b', name: 'StableLM 3B (Q4_K_M)', size: '2.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/stablelm-3b-4e1t-GGUF/resolve/main/stablelm-3b-4e1t-q4_k_m.gguf?download=true' },

  // --- ORCA SERIES ---
  { id: 'orca-2-7b', name: 'Orca 2 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Orca-2-7B-GGUF/resolve/main/orca-2-7b-q4_k_m.gguf?download=true' },
  { id: 'orca-2-13b', name: 'Orca 2 13B (Q4_K_M)', size: '8.1 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Orca-2-13B-GGUF/resolve/main/orca-2-13b-q4_k_m.gguf?download=true' },
  { id: 'orca-mini-7b', name: 'Orca Mini 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/orca-mini-7b-GGUF/resolve/main/orca-mini-7b.q4_k_m.gguf?download=true' },
  { id: 'orca-mini-13b', name: 'Orca Mini 13B (Q4_K_M)', size: '8.1 GB', downloadUrl: 'https://huggingface.co/TheBloke/orca-mini-13b-GGUF/resolve/main/orca-mini-13b.q4_k_m.gguf?download=true' },

  // --- COMMAND R SERIES ---
  { id: 'command-r-35b', name: 'Command R 35B (Q4_K_M)', size: '21.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Command-R-35B-GGUF/resolve/main/command-r-35b-q4_k_m.gguf?download=true' },
  { id: 'command-r-plus-104b', name: 'Command R+ 104B (Q4_K_M)', size: '63.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Command-R-plus-104B-GGUF/resolve/main/command-r-plus-104b-q4_k_m.gguf?download=true' },

  // --- INTERNLM SERIES ---
  { id: 'internlm2-7b', name: 'InternLM 2 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/InternLM2-7B-GGUF/resolve/main/InternLM2-7B-Q4_K_M.gguf?download=true' },
  { id: 'internlm2-20b', name: 'InternLM 2 20B (Q4_K_M)', size: '12.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/InternLM2-20B-GGUF/resolve/main/InternLM2-20B-Q4_K_M.gguf?download=true' },

  // --- DBRX SERIES ---
  { id: 'dbrx-132b', name: 'DBRX 132B (Q4_K_M)', size: '79.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/DBRX-132B-GGUF/resolve/main/dbrx-132b-q4_k_m.gguf?download=true' },

  // --- JAMBA SERIES ---
  { id: 'jamba-47b', name: 'Jamba 47B Instruct (Q4_K_M)', size: '28.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Jamba-47B-Instruct-GGUF/resolve/main/jamba-47b-instruct-q4_k_m.gguf?download=true' },
  { id: 'jamba-12b', name: 'Jamba 12B Instruct (Q4_K_M)', size: '7.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Jamba-12B-Instruct-GGUF/resolve/main/jamba-12b-instruct-q4_k_m.gguf?download=true' },

  // --- BLUE SERIES ---
  { id: 'blue-7b', name: 'Blue 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/blue-7b-instruct-GGUF/resolve/main/blue-7b-instruct-q4_k_m.gguf?download=true' },

  // --- OLMO SERIES ---
  { id: 'olmo-7b', name: 'OLMo 7B Instruct (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/OLMo-7B-Instruct-GGUF/resolve/main/OLMo-7B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'olmo2-7b', name: 'OLMo 2 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/OLMo2-7B-GGUF/resolve/main/olmo2-7b-q4_k_m.gguf?download=true' },
  { id: 'olmo2-13b', name: 'OLMo 2 13B (Q4_K_M)', size: '8.1 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/OLMo2-13B-GGUF/resolve/main/olmo2-13b-q4_k_m.gguf?download=true' },

  // --- LLAMA 2 SERIES ---
  { id: 'llama-2-7b', name: 'Llama 2 7B Chat (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.q4_k_m.gguf?download=true' },
  { id: 'llama-2-13b', name: 'Llama 2 13B Chat (Q4_K_M)', size: '8.1 GB', downloadUrl: 'https://huggingface.co/TheBloke/Llama-2-13B-Chat-GGUF/resolve/main/llama-2-13b-chat.q4_k_m.gguf?download=true' },
  { id: 'llama-2-70b', name: 'Llama 2 70B Chat (Q4_K_M)', size: '42.0 GB', downloadUrl: 'https://huggingface.co/TheBloke/Llama-2-70B-Chat-GGUF/resolve/main/llama-2-70b-chat.q4_k_m.gguf?download=true' },

  // --- QWEN 1 SERIES ---
  { id: 'qwen-1.5-0.5b', name: 'Qwen 1.5 0.5B (Q4_K_M)', size: '0.4 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1.5-0.5b-chat-q4_k_m.gguf?download=true' },
  { id: 'qwen-1.5-1.8b', name: 'Qwen 1.5 1.8B (Q4_K_M)', size: '1.2 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat-GGUF/resolve/main/qwen1.5-1.8b-chat-q4_k_m.gguf?download=true' },
  { id: 'qwen-1.5-4b', name: 'Qwen 1.5 4B (Q4_K_M)', size: '2.7 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen1.5-4B-Chat-GGUF/resolve/main/qwen1.5-4b-chat-q4_k_m.gguf?download=true' },
  { id: 'qwen-1.5-7b', name: 'Qwen 1.5 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen1.5-7B-Chat-GGUF/resolve/main/qwen1.5-7b-chat-q4_k_m.gguf?download=true' },
  { id: 'qwen-1.5-14b', name: 'Qwen 1.5 14B (Q4_K_M)', size: '8.9 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen1.5-14B-Chat-GGUF/resolve/main/qwen1.5-14b-chat-q4_k_m.gguf?download=true' },
  { id: 'qwen-1.5-72b', name: 'Qwen 1.5 72B (Q4_K_M)', size: '43.0 GB', downloadUrl: 'https://huggingface.co/Qwen/Qwen1.5-72B-Chat-GGUF/resolve/main/qwen1.5-72b-chat-q4_k_m.gguf?download=true' },

  // --- GLM SERIES ---
  { id: 'glm-4-9b', name: 'GLM-4 9B Chat (Q4_K_M)', size: '5.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/GLM-4-9B-Chat-GGUF/resolve/main/glm-4-9b-chat-q4_k_m.gguf?download=true' },
  { id: 'glm-4-32k-9b', name: 'GLM-4 9B 32K (Q4_K_M)', size: '5.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/GLM-4-9B-32K-Chat-GGUF/resolve/main/glm-4-9b-32k-chat-q4_k_m.gguf?download=true' },
  { id: 'glm-4v-9b', name: 'GLM-4V 9B Vision (Q4_K_M)', size: '5.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/GLM-4V-9B-Chat-GGUF/resolve/main/glm-4v-9b-chat-q4_k_m.gguf?download=true' },

  // --- MINISTRAL SERIES ---
  { id: 'ministral-3b', name: 'Ministral 3B (Q4_K_M)', size: '2.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Ministral-3B-GGUF/resolve/main/ministral-3b-q4_k_m.gguf?download=true' },
  { id: 'ministral-8b', name: 'Ministral 8B Instruct (Q4_K_M)', size: '4.9 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Ministral-8B-Instruct-GGUF/resolve/main/ministral-8b-instruct-q4_k_m.gguf?download=true' },
  { id: 'ministral-3-14b', name: 'Ministral 3 14B (Q4_K_M)', size: '8.9 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Ministral-3-14B-GGUF/resolve/main/ministral-3-14b-q4_k_m.gguf?download=true' },

  // --- DEVSTRAL SERIES ---
  { id: 'devstral-24b', name: 'Devstral 24B (Q4_K_M)', size: '14.8 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Devstral-24B-GGUF/resolve/main/devstral-24b-q4_k_m.gguf?download=true' },

  // --- GRANITE SERIES ---
  { id: 'granite-3.0-8b', name: 'Granite 3.0 8B (Q4_K_M)', size: '4.9 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/granite-3.0-8b-GGUF/resolve/main/granite-3_0-8b-q4_k_m.gguf?download=true' },
  { id: 'granite-3.0-3b', name: 'Granite 3.0 3B (Q4_K_M)', size: '2.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/granite-3.0-3b-GGUF/resolve/main/granite-3_0-3b-q4_k_m.gguf?download=true' },

  // --- MISC MODELS ---
  { id: 'k2-2.5', name: 'Kimi K2.5 (Q4_K_M)', size: '14.8 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/k2.5-GGUF/resolve/main/k2.5-q4_k_m.gguf?download=true' },
  { id: 'nemo-12b-inst', name: 'Nemotron 12B Instruct (Q4_K_M)', size: '7.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Nemotron-12B-Instruct-GGUF/resolve/main/Nemotron-12B-Instruct-Q4_K_M.gguf?download=true' },
  { id: 'hermes-3-8b', name: 'Hermes 3 8B (Q4_K_M)', size: '4.9 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Hermes-3-8B-Llama-3.1-8B-GGUF/resolve/main/Hermes-3-8B-Llama-3.1-8B-Q4_K_M.gguf?download=true' },
  { id: 'yi-coder-9b', name: 'Yi Coder 9B (Q4_K_M)', size: '5.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Yi-Coder-9B-Chat-GGUF/resolve/main/yi-coder-9b-chat-q4_k_m.gguf?download=true' },
  { id: 'phi-3.5-mini-inst', name: 'Phi-3.5 Mini 4K Instruct (Q8_0)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Phi-3.5-mini-instruct-GGUF/resolve/main/phi-3.5-mini-instruct-q8_0.gguf?download=true' },
  { id: 'nousresearch-7b', name: 'NousResearch 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/NousResearch-Hermes-2-Yi-34B-GGUF/resolve/main/nousresearch-hermes-2-yi-34b.q4_k_m.gguf?download=true' },
  { id: 'wizardmath-7b', name: 'WizardMath 7B V1.1 (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/WizardLM/WizardMath-7B-V1.1-GGUF/resolve/main/wizardmath-7b-v1.1-q4_k_m.gguf?download=true' },
  { id: 'wizardcoder-7b', name: 'WizardCoder 7B V1.0 (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/WizardLM/WizardCoder-7B-V1.0-GGUF/resolve/main/wizardcoder-7b-v1.0-q4_k_m.gguf?download=true' },
  { id: 'gpt4all-7b', name: 'GPT4All 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/nomic-ai/gpt4all-7b-gguf/resolve/main/gpt4all-7b.q4_k_m.gguf?download=true' },
  { id: 'mamba-7b', name: 'Mamba 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/TheBloke/Mamba-7B-GGUF/resolve/main/mamba-7b.q4_k_m.gguf?download=true' },
  { id: 'mamba-2.8b', name: 'Mamba 2.8B (Q4_K_M)', size: '1.8 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/mamba-2.8b-GGUF/resolve/main/mamba-2.8b-q4_k_m.gguf?download=true' },
  { id: 'gemma-2b-it', name: 'Gemma 2B Instruct (Q4_K_M)', size: '1.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-2b-it-GGUF/resolve/main/gemma-2b-it-q4_k_m.gguf?download=true' },
  { id: 'qwen-2-0.5b', name: 'Qwen 2 0.5B (Q4_K_M)', size: '0.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Qwen2-0.5B-GGUF/resolve/main/qwen2-0.5b-q4_k_m.gguf?download=true' },
  { id: 'qwen-2-1.5b', name: 'Qwen 2 1.5B (Q4_K_M)', size: '1.1 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Qwen2-1.5B-GGUF/resolve/main/qwen2-1.5b-q4_k_m.gguf?download=true' },
  { id: 'qwen-2-7b', name: 'Qwen 2 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Qwen2-7B-GGUF/resolve/main/qwen2-7b-q4_k_m.gguf?download=true' },
  { id: 'llama-3-granite-8b', name: 'Llama 3 Granite 8B (Q4_K_M)', size: '4.9 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3-Granite-8B-GGUF/resolve/main/Llama-3-Granite-8B-Q4_K_M.gguf?download=true' },
  { id: 'llama-3-smollm-1.7b', name: 'Llama 3 SmolLM 1.7B (Q4_K_M)', size: '1.2 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3-SmolLM-1.7B-GGUF/resolve/main/Llama-3-SmolLM-1.7B-Q4_K_M.gguf?download=true' },
  { id: 'llama-3.2-11b', name: 'Llama 3.2 11B Vision (Q4_K_M)', size: '6.8 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.2-11B-Vision-GGUF/resolve/main/Llama-3.2-11B-Vision-Q4_K_M.gguf?download=true' },
  { id: 'llama-3.2-90b', name: 'Llama 3.2 90B Vision (Q4_K_M)', size: '54.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.2-90B-Vision-GGUF/resolve/main/Llama-3.2-90B-Vision-Q4_K_M.gguf?download=true' },
  { id: 'nemotron-4-340b', name: 'Nemotron 4 340B (Q4_K_M)', size: '204.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/Nemotron-4-340B-GGUF/resolve/main/nemotron-4-340b-q4_k_m.gguf?download=true' },
  { id: 'qwen-2.5-0.5b-inst', name: 'Qwen 2.5 0.5B Instruct (Q8_0)', size: '0.8 GB', downloadUrl: 'https://huggingface.co/v8karlo/Qwen2.5-0.5B-Instruct-Q8_0-GGUF/resolve/main/qwen2.5-0.5b-instruct-q8_0.gguf?download=true' },
  { id: 'stablelm-zephyr-3b', name: 'StableLM Zephyr 3B (Q4_K_M)', size: '2.0 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/stablelm-zephyr-3b-GGUF/resolve/main/stablelm-zephyr-3b-q4_k_m.gguf?download=true' },
  { id: 'litgpt-7b', name: 'LitGPT 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/LitGPT-7B-GGUF/resolve/main/litgpt-7b-q4_k_m.gguf?download=true' },
  { id: 'palm-2-24b', name: 'PaLM 2 24B (Q4_K_M)', size: '14.5 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/PaLM-2-24B-GGUF/resolve/main/palm-2-24b-q4_k_m.gguf?download=true' },
  { id: 'dolphin-2.9-7b', name: 'Dolphin 2.9 7B (Q4_K_M)', size: '4.4 GB', downloadUrl: 'https://huggingface.co/lmstudio-community/dolphin-2.9-llama-7b-GGUF/resolve/main/dolphin-2.9-llama-7b-q4_k_m.gguf?download=true' },
];
