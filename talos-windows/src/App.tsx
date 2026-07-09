import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { IconMessage, IconServer2, IconSettings, IconRefresh, IconX, IconArrowRight, IconMenu2, IconArrowBarToLeft, IconPencil, IconDotsVertical, IconTrash, IconPlus, IconHammer, IconRobot, IconSearch, IconDownload, IconArrowUpRight, IconCopy, IconEye, IconTool, IconBrain, IconCode, IconCpu, IconPalette, IconUser, IconMoodSmile, IconHeartbeat, IconRobotFace, IconList, IconColumns2, IconLanguage, IconChevronDown, IconCheck, IconBolt, IconInfoCircle, IconAlertTriangle, IconPlayerPlay, IconImageInPicture, IconFile, IconHeart } from '@tabler/icons-react';
import { Checkout } from '@ghostpay/sdk';


type View = 'chat' | 'server' | 'settings' | 'robot' | 'models';
type Message = { role: 'user' | 'assistant' | 'system'; content: string };
type Conversation = { id: string; title: string; messages: Message[]; createdAt: number };
type McpTool = { id: string; name: string; description: string; enabled: boolean };
type HfModel = { id: string; modelId: string; author: string; originalAuthor?: string; name: string; description: string; downloads: number; likes: number; lastModified: string; tags: string[]; pipeline_tag: string; safetensors?: { total: number }; verified?: boolean };
type HfModelFile = { path: string; type: string; size: number };

const AUTHOR_AVATARS: Record<string, string> = { 'google': '/avatars/google.png', 'qwen': '/avatars/qwen-color.png', 'nvidia': '/avatars/nvidia.png', 'liquidai': '/avatars/liquidai.png', 'zhipuai': '/avatars/zhipuai.png', 'mistralai': '/avatars/mistral.png', 'allenai': '/avatars/allenai.png', 'essentialai': '/avatars/essentialai.png', 'unsloth': '/avatars/unsloth.png', 'huggingface': '/avatars/huggingface.svg', 'minimaxai': '/avatars/minimax-color.png', 'deepseek-ai': '/avatars/deepseek-color.png', 'microsoft': '/avatars/microsoft-color.png', 'meta-llama': '/avatars/meta-color.png', 'meta': '/avatars/meta-color.png', '01-ai': '/avatars/openai.png', 'openai': '/avatars/openai.png', 'thudm': '/avatars/thudm.png', 'empero-ai': '/avatars/qwen-color.png', 'city96': '/avatars/flux-ai-icon.webp', 'black-forest-labs': '/avatars/flux-ai-icon.webp', 'tencent': '/avatars/HunyuanVideo.avif', 'second-state': '/avatars/stability-ai.png', 'Aero-Ex': '/avatars/microsoft-color.png', 'lightricks': '/avatars/HunyuanVideo.avif', 'bartowski': '/avatars/huggingface.svg', 'stabilityai': '/avatars/stability-ai.png' };

function getAuthorAvatar(model: HfModel): string | null {
  const author = (model.originalAuthor || model.author).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(AUTHOR_AVATARS)) { const key = k.toLowerCase().replace(/-/g, ''); if (author.includes(key) || key.includes(author)) return v; }
  return null;
}

const VERIFIED_MODELS: HfModel[] = [
  { id: 'unsloth/gemma-4-12b-it-GGUF', modelId: 'unsloth/gemma-4-12b-it-GGUF', author: 'Unsloth', originalAuthor: 'Google', name: 'Gemma 4 12B', description: 'Gemma 4 12B reasoning model with image support', downloads: 1344206, likes: 699, lastModified: new Date(Date.now() - 23*86400000).toISOString(), tags: ['gguf', 'vision', 'reasoning', 'tool-use'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/gemma-4-E4B-it-GGUF', modelId: 'unsloth/gemma-4-E4B-it-GGUF', author: 'Unsloth', originalAuthor: 'Google', name: 'Gemma 4 E4B', description: 'Gemma4 effective 4B version with image input and reasoning.', downloads: 798800, likes: 521, lastModified: new Date(Date.now() - 76*86400000).toISOString(), tags: ['gguf', 'vision', 'tool-use', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/gemma-4-E2B-it-GGUF', modelId: 'unsloth/gemma-4-E2B-it-GGUF', author: 'Unsloth', originalAuthor: 'Google', name: 'Gemma 4 E2B', description: 'Gemma4 effective 2B version with image input and reasoning.', downloads: 744337, likes: 246, lastModified: new Date(Date.now() - 76*86400000).toISOString(), tags: ['gguf', 'vision', 'tool-use', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/NVIDIA-Nemotron-3-Nano-4B-GGUF', modelId: 'nvidia/NVIDIA-Nemotron-3-Nano-4B-GGUF', author: 'NVIDIA', name: 'Nemotron 3 Nano 4B', description: 'General purpose reasoning and chat model by NVIDIA', downloads: 21968, likes: 166, lastModified: new Date(Date.now() - 102*86400000).toISOString(), tags: ['gguf', 'reasoning', 'chat'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/NVIDIA-Nemotron-Nano-12B-v2-GGUF', modelId: 'nvidia/NVIDIA-Nemotron-Nano-12B-v2-GGUF', author: 'NVIDIA', name: 'Nemotron Nano 12B v2', description: 'General purpose 12B model with strong multilingual and reasoning capabilities.', downloads: 76317, likes: 2, lastModified: new Date(Date.now() - 180*86400000).toISOString(), tags: ['gguf', 'reasoning', 'chat', 'multilingual', 'tool-use'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-GGUF', modelId: 'nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-GGUF', author: 'NVIDIA', name: 'Nemotron 3 Ultra 550B', description: 'Massive 550B MoE model with 55B active parameters.', downloads: 24523, likes: 29, lastModified: new Date(Date.now() - 20*86400000).toISOString(), tags: ['gguf', 'moe', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-GGUF', modelId: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-GGUF', author: 'NVIDIA', name: 'Nemotron 3 Nano 30B', description: '30B MoE model with 3B active params.', downloads: 16706, likes: 10, lastModified: new Date(Date.now() - 180*86400000).toISOString(), tags: ['gguf', 'moe', 'chat'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/NVIDIA-Nemotron-3-Nano-Omni-30B-A3B-Reasoning-GGUF', modelId: 'nvidia/NVIDIA-Nemotron-3-Nano-Omni-30B-A3B-Reasoning-GGUF', author: 'NVIDIA', name: 'Nemotron 3 Nano Omni 30B', description: 'Multimodal reasoning model with 30B MoE architecture.', downloads: 15516, likes: 132, lastModified: new Date(Date.now() - 50*86400000).toISOString(), tags: ['gguf', 'moe', 'reasoning', 'multimodal'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-GGUF', modelId: 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-GGUF', author: 'NVIDIA', name: 'Nemotron 3 Super 120B', description: '120B MoE model with 12B active params.', downloads: 10649, likes: 135, lastModified: new Date(Date.now() - 100*86400000).toISOString(), tags: ['gguf', 'moe', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/Nemotron-Cascade-2-30B-A3B-GGUF', modelId: 'nvidia/Nemotron-Cascade-2-30B-A3B-GGUF', author: 'NVIDIA', name: 'Nemotron Cascade 2 30B', description: 'Cascade architecture model for efficient reasoning.', downloads: 8136, likes: 40, lastModified: new Date(Date.now() - 90*86400000).toISOString(), tags: ['gguf', 'reasoning', 'moe'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/Llama-3.3-Nemotron-Super-49B-v1.5-GGUF', modelId: 'nvidia/Llama-3.3-Nemotron-Super-49B-v1.5-GGUF', author: 'NVIDIA', name: 'Llama 3.3 Nemotron Super 49B', description: 'NVIDIA Llama 3.3 based model with enhanced capabilities.', downloads: 8039, likes: 23, lastModified: new Date(Date.now() - 180*86400000).toISOString(), tags: ['gguf', 'reasoning', 'chat'], pipeline_tag: 'text-generation', verified: true },
  { id: 'nvidia/NVIDIA-Nemotron-Nano-9B-v2-GGUF', modelId: 'nvidia/NVIDIA-Nemotron-Nano-9B-v2-GGUF', author: 'NVIDIA', name: 'Nemotron Nano 9B v2', description: 'Compact 9B model optimized for speed.', downloads: 3866, likes: 30, lastModified: new Date(Date.now() - 200*86400000).toISOString(), tags: ['gguf', 'chat', 'fast'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/Qwen3.5-9B-GGUF', modelId: 'unsloth/Qwen3.5-9B-GGUF', author: 'unsloth', originalAuthor: 'Qwen', name: 'Qwen3.5 9B', description: '9B dense model supporting 262k tokens context.', downloads: 1058201, likes: 719, lastModified: new Date(Date.now() - 115*86400000).toISOString(), tags: ['gguf', 'multimodal', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/Qwen3.6-35B-A3B-GGUF', modelId: 'unsloth/Qwen3.6-35B-A3B-GGUF', author: 'unsloth', originalAuthor: 'Qwen', name: 'Qwen3.6 35B MoE', description: '35B MoE with 3B active params. Vision + text.', downloads: 886985, likes: 1281, lastModified: new Date(Date.now() - 15*86400000).toISOString(), tags: ['gguf', 'moe', 'vision', 'multimodal'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/Qwen3.6-27B-GGUF', modelId: 'unsloth/Qwen3.6-27B-GGUF', author: 'unsloth', originalAuthor: 'Qwen', name: 'Qwen3.6 27B', description: '27B dense model with vision and long context.', downloads: 563027, likes: 829, lastModified: new Date(Date.now() - 25*86400000).toISOString(), tags: ['gguf', 'vision', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/Qwen3.6-27B-MTP-GGUF', modelId: 'unsloth/Qwen3.6-27B-MTP-GGUF', author: 'unsloth', originalAuthor: 'Qwen', name: 'Qwen3.6 27B MTP', description: '27B with Multi-Token Prediction for faster inference.', downloads: 874422, likes: 869, lastModified: new Date(Date.now() - 20*86400000).toISOString(), tags: ['gguf', 'vision', 'mtp', 'fast'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/Qwen3-Coder-Next-GGUF', modelId: 'unsloth/Qwen3-Coder-Next-GGUF', author: 'unsloth', originalAuthor: 'Qwen', name: 'Qwen3 Coder Next', description: 'SOTA coding model from Qwen.', downloads: 286637, likes: 734, lastModified: new Date(Date.now() - 30*86400000).toISOString(), tags: ['gguf', 'code', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF', modelId: 'unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF', author: 'unsloth', originalAuthor: 'Qwen', name: 'Qwen3 Coder 30B MoE', description: '30B MoE coding model with 3B active params.', downloads: 241916, likes: 761, lastModified: new Date(Date.now() - 45*86400000).toISOString(), tags: ['gguf', 'code', 'moe'], pipeline_tag: 'text-generation', verified: true },
  { id: 'empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF', modelId: 'empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF', author: 'empero-ai', name: 'Qwythos 9B', description: '9B reasoning model with Claude distillation. 1M context.', downloads: 831529, likes: 753, lastModified: new Date(Date.now() - 8*86400000).toISOString(), tags: ['gguf', 'reasoning', 'vision', 'long-context', 'tool-use'], pipeline_tag: 'text-generation', verified: true },
  { id: 'MaziyarPanahi/Qwen3-8B-GGUF', modelId: 'MaziyarPanahi/Qwen3-8B-GGUF', author: 'MaziyarPanahi', originalAuthor: 'Qwen', name: 'Qwen3 8B', description: 'General-purpose multilingual model.', downloads: 275586, likes: 10, lastModified: new Date(Date.now() - 80*86400000).toISOString(), tags: ['gguf', 'chat', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'MaziyarPanahi/Qwen3-14B-GGUF', modelId: 'MaziyarPanahi/Qwen3-14B-GGUF', author: 'MaziyarPanahi', originalAuthor: 'Qwen', name: 'Qwen3 14B', description: '14B model with enhanced reasoning.', downloads: 276802, likes: 11, lastModified: new Date(Date.now() - 75*86400000).toISOString(), tags: ['gguf', 'reasoning', 'multilingual'], pipeline_tag: 'text-generation', verified: true },
  { id: 'MaziyarPanahi/Qwen3-32B-GGUF', modelId: 'MaziyarPanahi/Qwen3-32B-GGUF', author: 'MaziyarPanahi', originalAuthor: 'Qwen', name: 'Qwen3 32B', description: '32B top-tier reasoning model.', downloads: 273526, likes: 2, lastModified: new Date(Date.now() - 70*86400000).toISOString(), tags: ['gguf', 'reasoning', 'multilingual'], pipeline_tag: 'text-generation', verified: true },
  { id: 'MaziyarPanahi/Qwen3-30B-A3B-GGUF', modelId: 'MaziyarPanahi/Qwen3-30B-A3B-GGUF', author: 'MaziyarPanahi', originalAuthor: 'Qwen', name: 'Qwen3 30B MoE', description: '30B MoE with only 3B active params.', downloads: 270549, likes: 4, lastModified: new Date(Date.now() - 72*86400000).toISOString(), tags: ['gguf', 'moe', 'fast'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/LFM2-24B-A2B-GGUF', modelId: 'unsloth/LFM2-24B-A2B-GGUF', author: 'Unsloth', originalAuthor: 'LiquidAI', name: 'Lfm2 24B A2B', description: '24B MoE with 2B active params for on-device.', downloads: 34500, likes: 6, lastModified: new Date(Date.now() - 122*86400000).toISOString(), tags: ['gguf', 'moe', 'edge'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/LFM2.5-1.2B-GGUF', modelId: 'unsloth/LFM2.5-1.2B-GGUF', author: 'Unsloth', originalAuthor: 'LiquidAI', name: 'Lfm2.5 1.2B', description: 'Lightweight on-device model.', downloads: 21000, likes: 3, lastModified: new Date(Date.now() - 170*86400000).toISOString(), tags: ['gguf', 'edge', 'lightweight'], pipeline_tag: 'text-generation', verified: true },
  { id: 'MaziyarPanahi/GLM-4.6V-Flash-GGUF', modelId: 'MaziyarPanahi/GLM-4.6V-Flash-GGUF', author: 'MaziyarPanahi', originalAuthor: 'ZhipuAI', name: 'GLM 4.6V Flash', description: '9B vision-language model. 128k context.', downloads: 65969, likes: 6, lastModified: new Date(Date.now() - 195*86400000).toISOString(), tags: ['gguf', 'vision', 'multilingual'], pipeline_tag: 'text-generation', verified: true },
  { id: 'THUDM/GLM-Z1-9B-0414-GGUF', modelId: 'THUDM/GLM-Z1-9B-0414-GGUF', author: 'THUDM', originalAuthor: 'ZhipuAI', name: 'GLM Z1 9B', description: 'Reasoning model with math and code capabilities.', downloads: 89000, likes: 45, lastModified: new Date(Date.now() - 80*86400000).toISOString(), tags: ['gguf', 'reasoning', 'code'], pipeline_tag: 'text-generation', verified: true },
  { id: 'THUDM/GLM-4-9B-Chat-GGUF', modelId: 'THUDM/GLM-4-9B-Chat-GGUF', author: 'THUDM', originalAuthor: 'ZhipuAI', name: 'GLM 4 9B Chat', description: 'Multilingual conversational model.', downloads: 67000, likes: 38, lastModified: new Date(Date.now() - 120*86400000).toISOString(), tags: ['gguf', 'chat', 'multilingual'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/GLM-5.2-GGUF', modelId: 'unsloth/GLM-5.2-GGUF', author: 'unsloth', originalAuthor: 'ZhipuAI', name: 'GLM 5.2', description: 'Latest Zhipu flagship MoE.', downloads: 146023, likes: 436, lastModified: new Date(Date.now() - 10*86400000).toISOString(), tags: ['gguf', 'moe', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/GLM-5.1-GGUF', modelId: 'unsloth/GLM-5.1-GGUF', author: 'unsloth', originalAuthor: 'ZhipuAI', name: 'GLM 5.1', description: 'MoE reasoning model.', downloads: 89841, likes: 203, lastModified: new Date(Date.now() - 45*86400000).toISOString(), tags: ['gguf', 'moe', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/GLM-5-GGUF', modelId: 'unsloth/GLM-5-GGUF', author: 'unsloth', originalAuthor: 'ZhipuAI', name: 'GLM 5', description: 'Powerful MoE model.', downloads: 5690, likes: 226, lastModified: new Date(Date.now() - 80*86400000).toISOString(), tags: ['gguf', 'moe', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/GLM-4.7-Flash-GGUF', modelId: 'unsloth/GLM-4.7-Flash-GGUF', author: 'unsloth', originalAuthor: 'ZhipuAI', name: 'GLM 4.7 Flash', description: 'Fast and efficient model.', downloads: 117259, likes: 652, lastModified: new Date(Date.now() - 60*86400000).toISOString(), tags: ['gguf', 'chat', 'fast'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/GLM-4.7-GGUF', modelId: 'unsloth/GLM-4.7-GGUF', author: 'unsloth', originalAuthor: 'ZhipuAI', name: 'GLM 4.7', description: 'Full-size reasoning model.', downloads: 10542, likes: 219, lastModified: new Date(Date.now() - 90*86400000).toISOString(), tags: ['gguf', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/GLM-4.6-GGUF', modelId: 'unsloth/GLM-4.6-GGUF', author: 'unsloth', originalAuthor: 'ZhipuAI', name: 'GLM 4.6', description: 'Versatile text model.', downloads: 10006, likes: 153, lastModified: new Date(Date.now() - 150*86400000).toISOString(), tags: ['gguf', 'chat', 'code'], pipeline_tag: 'text-generation', verified: true },
  { id: 'unsloth/GLM-4.5-Air-GGUF', modelId: 'unsloth/GLM-4.5-Air-GGUF', author: 'unsloth', originalAuthor: 'ZhipuAI', name: 'GLM 4.5 Air', description: 'Lightweight fast model.', downloads: 13144, likes: 173, lastModified: new Date(Date.now() - 180*86400000).toISOString(), tags: ['gguf', 'chat', 'fast'], pipeline_tag: 'text-generation', verified: true },
  { id: 'bartowski/gemma-3-27b-it-GGUF', modelId: 'bartowski/gemma-3-27b-it-GGUF', author: 'bartowski', originalAuthor: 'Google', name: 'Gemma 3 27B', description: 'Instruction-tuned reasoning model.', downloads: 410000, likes: 198, lastModified: new Date(Date.now() - 70*86400000).toISOString(), tags: ['gguf', 'reasoning'], pipeline_tag: 'text-generation', verified: true },
  { id: 'bartowski/gemma-3-12b-it-GGUF', modelId: 'bartowski/gemma-3-12b-it-GGUF', author: 'bartowski', originalAuthor: 'Google', name: 'Gemma 3 12B', description: 'Balanced performance model.', downloads: 320000, likes: 156, lastModified: new Date(Date.now() - 75*86400000).toISOString(), tags: ['gguf', 'chat'], pipeline_tag: 'text-generation', verified: true },
  { id: 'city96/FLUX.1-dev-gguf', modelId: 'city96/FLUX.1-dev-gguf', author: 'city96', originalAuthor: 'Black Forest Labs', name: 'FLUX.1 Dev', description: 'High-quality text-to-image diffusion model.', downloads: 118859, likes: 1376, lastModified: new Date(Date.now() - 300*86400000).toISOString(), tags: ['gguf', 'image-generation', 'text-to-image'], pipeline_tag: 'text-to-image', verified: true },
  { id: 'city96/FLUX.2-dev-gguf', modelId: 'city96/FLUX.2-dev-gguf', author: 'city96', originalAuthor: 'Black Forest Labs', name: 'FLUX.2 Dev', description: 'FLUX 2.0 improved image generation.', downloads: 139963, likes: 148, lastModified: new Date(Date.now() - 60*86400000).toISOString(), tags: ['gguf', 'image-generation', 'image-editing'], pipeline_tag: 'image-to-image', verified: true },
  { id: 'unsloth/FLUX.2-klein-4B-GGUF', modelId: 'unsloth/FLUX.2-klein-4B-GGUF', author: 'unsloth', originalAuthor: 'Black Forest Labs', name: 'FLUX.2 Klein 4B', description: 'Compact 4B image generation model.', downloads: 244695, likes: 169, lastModified: new Date(Date.now() - 45*86400000).toISOString(), tags: ['gguf', 'image-generation'], pipeline_tag: 'text-to-image', verified: true },
  { id: 'unsloth/FLUX.2-klein-9B-GGUF', modelId: 'unsloth/FLUX.2-klein-9B-GGUF', author: 'unsloth', originalAuthor: 'Black Forest Labs', name: 'FLUX.2 Klein 9B', description: 'Higher quality image generation.', downloads: 112244, likes: 264, lastModified: new Date(Date.now() - 45*86400000).toISOString(), tags: ['gguf', 'image-generation'], pipeline_tag: 'image-to-image', verified: true },
  { id: 'city96/FLUX.1-schnell-gguf', modelId: 'city96/FLUX.1-schnell-gguf', author: 'city96', originalAuthor: 'Black Forest Labs', name: 'FLUX.1 Schnell', description: 'Fast image generation.', downloads: 44754, likes: 338, lastModified: new Date(Date.now() - 300*86400000).toISOString(), tags: ['gguf', 'image-generation'], pipeline_tag: 'text-to-image', verified: true },
  { id: 'second-state/stable-diffusion-3.5-large-GGUF', modelId: 'second-state/stable-diffusion-3.5-large-GGUF', author: 'second-state', originalAuthor: 'Stability AI', name: 'SD 3.5 Large', description: 'Stability AI high-quality text-to-image.', downloads: 23511, likes: 16, lastModified: new Date(Date.now() - 200*86400000).toISOString(), tags: ['gguf', 'image-generation'], pipeline_tag: 'text-to-image', verified: true },
  { id: 'city96/HunyuanVideo-gguf', modelId: 'city96/HunyuanVideo-gguf', author: 'city96', originalAuthor: 'Tencent', name: 'HunyuanVideo', description: 'Tencent text-to-video generation.', downloads: 3801, likes: 190, lastModified: new Date(Date.now() - 180*86400000).toISOString(), tags: ['gguf', 'text-to-video'], pipeline_tag: 'text-to-video', verified: true },
  { id: 'city96/HunyuanVideo-I2V-gguf', modelId: 'city96/HunyuanVideo-I2V-gguf', author: 'city96', originalAuthor: 'Tencent', name: 'HunyuanVideo I2V', description: 'Image-to-video generation.', downloads: 6058, likes: 38, lastModified: new Date(Date.now() - 150*86400000).toISOString(), tags: ['gguf', 'image-to-video'], pipeline_tag: 'image-to-video', verified: true },
  { id: 'jayn7/HunyuanVideo-1.5_T2V_480p-GGUF', modelId: 'jayn7/HunyuanVideo-1.5_T2V_480p-GGUF', author: 'jayn7', originalAuthor: 'Tencent', name: 'HunyuanVideo 1.5 T2V', description: 'Text-to-video 480p.', downloads: 2804, likes: 6, lastModified: new Date(Date.now() - 60*86400000).toISOString(), tags: ['gguf', 'text-to-video'], pipeline_tag: 'text-to-video', verified: true },
  { id: 'city96/LTX-Video-gguf', modelId: 'city96/LTX-Video-gguf', author: 'city96', originalAuthor: 'Lightricks', name: 'LTX-Video', description: 'Fast text-to-video and image-to-video.', downloads: 3682, likes: 28, lastModified: new Date(Date.now() - 170*86400000).toISOString(), tags: ['gguf', 'text-to-video', 'image-to-video'], pipeline_tag: 'image-to-video', verified: true },
  { id: 'Aero-Ex/Trellis2-GGUF', modelId: 'Aero-Ex/Trellis2-GGUF', author: 'Aero-Ex', name: 'Trellis2', description: 'Image-to-3D generation.', downloads: 75875, likes: 19, lastModified: new Date(Date.now() - 160*86400000).toISOString(), tags: ['gguf', 'image-to-3d'], pipeline_tag: 'image-to-3d', verified: true },
].sort((a, b) => b.downloads - a.downloads);

const VERIFIED_AUTHORS = ['google', 'Qwen', 'THUDM', 'openai', 'meta-llama', 'microsoft', 'nvidia', 'deepseek-ai', 'mistralai', '01-ai', 'huggingface', 'unsloth', 'bartowski', 'EssentialAI', 'allenai', 'city96', 'black-forest-labs', 'stability-ai', 'tencent', 'lightricks', 'second-state', 'Aero-Ex', 'stabilityai'];
function isVerifiedModel(modelId: string): boolean { const author = modelId.split('/')[0]?.toLowerCase() || ''; return VERIFIED_AUTHORS.some(v => v.toLowerCase() === author); }
let convCounter = 0;
function newConvId() { return `conv_${++convCounter}_${Date.now()}`; }
const MCP_TOOLS: McpTool[] = [{ id: 'file_write', name: 'File Write', description: 'Write files to disk', enabled: false }, { id: 'web_search', name: 'Web Search', description: 'Search the internet', enabled: false }];
function estimateTokens(text: string): number { return Math.ceil(text.length / 3.5); }

const LANGUAGES = [
  { value: 'pt-BR', label: 'Portugu\u00eas (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espa\u00f1ol' },
  { value: 'fr', label: 'Fran\u00e7ais' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh-CN', label: '\u4e2d\u6587 (\u7b80\u4f53)' },
  { value: 'ja', label: '\u65e5\u672c\u8a9e' },
  { value: 'ko', label: '\ud55c\uad6d\uc5b4' },
  { value: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
];

const LOCALE_MAP: Record<string, string> = {
  'pt': 'pt-BR', 'pt-BR': 'pt-BR', 'en': 'en', 'es': 'es',
  'fr': 'fr', 'de': 'de', 'zh': 'zh-CN', 'ja': 'ja', 'ko': 'ko',
  'ru': 'ru', 'ar': 'ar',
};

// All translations use Unicode escapes for non-ASCII to prevent encoding corruption
const STRINGS: Record<string, Record<string, string>> = {
  'welcomeTitle': { 'pt-BR': 'Bem-vindo ao Talos LLM Studio', en: 'Welcome to Talos LLM Studio', es: 'Bienvenido a Talos LLM Studio', fr: 'Bienvenue sur Talos LLM Studio', de: 'Willkommen bei Talos LLM Studio', 'zh-CN': '\u6b22\u8fce\u4f7f\u7528 Talos LLM Studio', ja: 'Talos LLM Studio \u3078\u3088\u3046\u3053\u305d', ko: 'Talos LLM Studio\ub85c \uc624\uc2e0 \uac83\uc744 \ud658\uc601\ud569\ub2c8\ub2e4', ru: '\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 Talos LLM Studio', ar: '\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0643 \u0641\u064a Talos LLM Studio' },
  'welcomeDesc': { 'pt-BR': 'Executa modelos de linguagem localmente, sem internet, sem limites. Privacidade total.', en: 'Run language models locally, no internet, no limits. Total privacy.', es: 'Ejecuta modelos de lenguaje localmente, sin internet, sin l\u00edmites. Privacidad total.', fr: 'Ex\u00e9cutez des mod\u00e8les de langage localemente, pas d\'internet, pas de limites. Confidentialit\u00e9 totale.', de: 'Sprachmodelle lokal ausf\u00fchren, kein Internet, keine Grenzen. Totale Privatsph\u00e4re.', 'zh-CN': '\u5728\u60a8\u7684\u8ba1\u7b97\u673a\u4e0a\u672c\u5730\u8fd0\u884c\u8bed\u8a00\u6a21\u578b\uff0c\u65e0\u9700\u4e92\u8054\u7f51\uff0c\u65e0\u9650\u5236\u3002\u5b8c\u5168\u9690\u79c1\u3002', ja: '\u8a00\u8a9e\u30e2\u30c7\u30eb\u3092\u30ed\u30fc\u30ab\u30eb\u3067\u5b9f\u884c\u3002\u30a4\u30f3\u30bf\u30fc\u30cd\u30c3\u30c8\u4e0d\u8981\u3001\u5236\u9650\u306a\u3057\u3002\u5b8c\u5168\u306a\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u3002', ko: '\uc5b8\uc5b4 \ubaa8\ub378\uc744 \ub85c\uceec\uc5d0\uc11c \uc2e4\ud589. \uc778\ud130\ub137 \ud544\ud544, \uc81c\ud55c \uc5c6\uc774. \uc644\uc8fc\ud558\ub294 \ud504\ub77c\uc774\ubc84\uc2dc.', ru: '\u0417\u0430\u043f\u0443\u0441\u043a\u0430\u0439\u0442\u0435 \u044f\u0437\u044b\u043a\u043e\u0432\u044b\u0435 \u043c\u043e\u0434\u0435\u043b\u0438 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e, \u0431\u0435\u0437 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0430, \u0431\u0435\u0437 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u0439. \u041f\u043e\u043b\u043d\u0430\u044f \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c.', ar: '\u0634\u063a\u0644 \u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0644\u063a\u0629 \u0645\u062d\u0644\u064a\u0627\u064b \u0639\u0644\u0649 \u062c\u0647\u0627\u0632\u0643\u060c \u0628\u062f\u0648\u0646 \u0625\u0646\u062a\u0631\u0646\u062a\u060c \u0628\u062f\u0648\u0646 \u062d\u062f\u0648\u062f\u3002 \u062e\u0635\u0648\u0635\u064a\u0629 \u062a\u0627\u0645\u0629.' },
  'welcomeStart': { 'pt-BR': 'Come\u00e7ar', en: 'Get Started', es: 'Comenzar', fr: 'Commencer', de: 'Loslegen', 'zh-CN': '\u5f00\u59cb\u4f7f\u7528', ja: '\u59cb\u3081\u308b', ko: '\uc2dc\uc791\ud558\uae30', ru: '\u041d\u0430\u0447\u0430\u0442\u044c', ar: '\u0627\u0628\u062f\u0623' },
  'chats': { 'pt-BR': 'Chats', en: 'Chats', es: 'Chats', fr: 'Chats', de: 'Chats', 'zh-CN': '\u804a\u5929', ja: '\u30c1\u30e3\u30c3\u30c8', ko: '\ucc44\ud305', ru: '\u0427\u0430\u0442\u044b', ar: '\u0645\u062d\u0627\u062f\u062b\u0627\u062a' },
  'models': { 'pt-BR': 'Modelos', en: 'Models', es: 'Modelos', fr: 'Mod\u00e8les', de: 'Modelle', 'zh-CN': '\u6a21\u578b', ja: '\u30e2\u30c7\u30eb', ko: '\ubaa8\ub378', ru: '\u041c\u043e\u0434\u0435\u043b\u0438', ar: '\u0646\u0645\u0627\u0630\u062c' },
  'installedModels': { 'pt-BR': 'Modelos Instalados', en: 'Installed Models', es: 'Modelos Instalados', fr: 'Mod\u00e8les Install\u00e9s', de: 'Installierte Modelle', 'zh-CN': '\u5df2\u5b89\u88c5\u6a21\u578b', ja: '\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u6e08\u307f\u30e2\u30c7\u30eb', ko: '\uc124\ud55c\uad6d\uc5b4 \ubaa8\ub378', ru: '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044b\u0435 \u043c\u043e\u0434\u0435\u043b\u0438', ar: '\u0627\u0644\u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0645\u062a\u0628\u062a\u0629' },
  'update': { 'pt-BR': 'Atualizar', en: 'Refresh', es: 'Actualizar', fr: 'Rafra\u00eetre', de: 'Aktualisieren', 'zh-CN': '\u5237\u65b0', ja: '\u66f4\u65b0', ko: '\uc0c8\ub85c\uace0', ru: '\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c', ar: '\u062a\u062d\u062f\u064a\u062b' },
  'noModelsFound': { 'pt-BR': 'Nenhum modelo encontrado', en: 'No models found', es: 'No se encontraron modelos', fr: 'Aucun mod\u00e8le trouv\u00e9', de: 'Keine Modelle gefunden', 'zh-CN': '\u672a\u627e\u5230\u6a21\u578b', ja: '\u30e2\u30c7\u30eb\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093', ko: '\ubaa8\ub378\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4', ru: '\u041c\u043e\u0434\u0435\u043b\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b', ar: '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0646\u0645\u0627\u0630\u062c' },
  'load': { 'pt-BR': 'Load', en: 'Load', es: 'Cargar', fr: 'Charger', de: 'Laden', 'zh-CN': '\u52a0\u8f7d', ja: '\u8aad\u307f\u8fbc\u307f', ko: '\ub85c\ub4dc', ru: '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c', ar: '\u062a\u062d\u0645\u064a\u0644' },
  'eject': { 'pt-BR': 'Eject', en: 'Eject', es: 'Expulsar', fr: '\u00c9jecter', de: 'Auswerfen', 'zh-CN': '\u5378\u8f7d', ja: '\u30a2\u30f3\u30ed\u30fc\u30c9', ko: '\uc5b4\ub85c\ub4dc', ru: '\u0412\u044b\u0433\u0440\u0443\u0437\u0438\u0442\u044c', ar: '\u0625\u062e\u0631\u0627\u062c' },
  'server': { 'pt-BR': 'Servidor', en: 'Server', es: 'Servidor', fr: 'Serveur', de: 'Server', 'zh-CN': '\u670d\u52a1\u5668', ja: '\u30b5\u30fc\u30d0\u30fc', ko: '\uc11c\ubc84', ru: '\u0421\u0435\u0440\u0432\u0435\u0440', ar: '\u062e\u0627\u062f\u0645' },
  'settings': { 'pt-BR': 'Settings', en: 'Settings', es: 'Configuraci\u00f3n', fr: 'Param\u00e8tres', de: 'Einstellungen', 'zh-CN': '\u8bbe\u7f6e', ja: '\u8a2d\u5b9a', ko: '\uc124\uc815', ru: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438', ar: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a' },
  'general': { 'pt-BR': 'Geral', en: 'General', es: 'General', fr: 'G\u00e9n\u00e9ral', de: 'Allgemein', 'zh-CN': '\u901a\u7528', ja: '\u4e00\u822c', ko: '\uc77c\ubc18', ru: '\u041e\u0431\u0449\u0438\u0435', ar: '\u0639\u0627\u0645' },
  'appearance': { 'pt-BR': 'Apar\u00eancia', en: 'Appearance', es: 'Apariencia', fr: 'Apparence', de: 'Erscheinung', 'zh-CN': '\u5916\u89c2', ja: '\u5916\u89b3', ko: '\uc678\ud615', ru: '\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0432\u0438\u0434', ar: '\u0627\u0644\u0645\u0638\u0647\u0631' },
  'chat': { 'pt-BR': 'Chat', en: 'Chat', es: 'Chat', fr: 'Chat', de: 'Chat', 'zh-CN': '\u804a\u5929', ja: '\u30c1\u30e3\u30c3\u30c8', ko: '\ucc44\ud305', ru: '\u0427\u0430\u0442', ar: '\u0645\u062d\u0627\u062f\u062ab' },
  'runtime': { 'pt-BR': 'Runtime', en: 'Runtime', es: 'Tiempo de ejecuci\u00f3n', fr: 'Ex\u00e9cution', de: 'Laufzeit', 'zh-CN': '\u8fd0\u884c\u65f6', ja: '\u30e9\u30f3\u30bf\u30a4\u30e0', ko: '\ub7f0\ud0c0\uc784', ru: '\u0421\u0440\u0435\u0434\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f', ar: '\u0628\u064a\u0626\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644' },
  'hardware': { 'pt-BR': 'Hardware', en: 'Hardware', es: 'Hardware', fr: 'Mat\u00e9riel', de: 'Hardware', 'zh-CN': '\u786c\u4ef6', ja: '\u30cf\u30fc\u30c9\u30a6\u30a7\u30a2', ko: '\ud558\ub4dc\uc6e8\uc5b4', ru: '\u0410\u043f\u043f\u0430\u0440\u0430\u0442\u043d\u043e\u0435 \u043e\u0431\u0435\u0441\u043f\u0435\u0447\u0435\u043d\u0438\u0435', ar: '\u0639\u062a\u0627\u062f' },
  'language': { 'pt-BR': 'Idioma', en: 'Language', es: 'Idioma', fr: 'Langue', de: 'Sprache', 'zh-CN': '\u8bed\u8a00', ja: '\u8a00\u8a9e', ko: '\uc5b8\uc5b4', ru: '\u042f\u0437\u044b\u043a', ar: '\u0627\u0644\u0644\u063a\u0629' },
  'languageDesc': { 'pt-BR': 'Alterar o idioma do aplicativo', en: 'Change the application language', es: 'Cambiar el idioma de la aplicaci\u00f3n', fr: 'Changer la langue de l\'application', de: 'App-Sprache \u00e4ndern', 'zh-CN': '\u66f4\u6539\u5e94\u7528\u8bed\u8a00', ja: '\u30a2\u30d7\u30ea\u306e\u8a00\u8a9e\u3092\u5909\u66f4', ko: '\uc571 \uc5b8\uc5b4 \ubcc0\uacbd', ru: '\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u044f\u0437\u044b\u043a \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f', ar: '\u062a\u063a\u064a\u064a\u0631 \u0644\u063a\u0629 \u0627\u0644\u062a\u0637\u0628\u064a\u0642' },
  'interfaceLanguage': { 'pt-BR': 'Idioma da Interface', en: 'Interface Language', es: 'Idioma de la Interfaz', fr: 'Langue de l\'interface', de: 'Oberfl\u00e4chensprache', 'zh-CN': '\u754c\u9762\u8bed\u8a00', ja: '\u30a4\u30f3\u30bf\u30fc\u30d5\u30a7\u30fc\u30b9\u8a00\u8a9e', ko: '\uc778\ud130\ud398\uc774\uc2a4 \uc5b8\uc5b4', ru: '\u042f\u0437\u044b\u043a \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430', ar: '\u0644\u063a\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0629' },
  'autoDetect': { 'pt-BR': 'Detectar idioma automaticamente', en: 'Auto-detect language', es: 'Detectar idioma autom\u00e1ticamente', fr: 'D\u00e9tection automatique', de: 'Sprache automatisch erkennen', 'zh-CN': '\u81ea\u52a8\u68c0\u6d4b\u8bed\u8a00', ja: '\u8a00\u8a9e\u3092\u81ea\u52d5\u691c\u51fa', ko: '\uc5b8\uc5b4 \uc790\ub3d9 \uac10\uc9c0', ru: '\u0410\u0432\u0442\u043e\u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435 \u044f\u0437\u044b\u043a\u0430', ar: '\u0643\u0634\u0641 \u0627\u0644\u0644\u063a\u0629 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b' },
  'contextSize': { 'pt-BR': 'Context Size (n_ctx)', en: 'Context Size (n_ctx)', es: 'Tama\u00f1o del Contexto', fr: 'Taille du Contexte', de: 'Kontextgr\u00f6\u00dfe', 'zh-CN': '\u4e0a\u4e0b\u6587\u5927\u5c0f', ja: '\u30b3\u30f3\u30c6\u30ad\u30b9\u30c8\u30b5\u30a4\u30ba', ko: '\ucee4\ud158\ud2b8 \ud06c\uae30', ru: '\u0420\u0430\u0437\u043c\u0435\u0440 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430', ar: '\u062d\u062c\u0645 \u0627\u0644\u0633\u064a\u0627\u0642' },
  'gpuLayers': { 'pt-BR': 'GPU Layers', en: 'GPU Layers', es: 'Capas GPU', fr: 'Couches GPU', de: 'GPU-Schichten', 'zh-CN': 'GPU \u5c42\u6570', ja: 'GPU \u30ec\u30a4\u30e3\u30fc', ko: 'GPU \ub808\uc774\uc5b4', ru: '\u0421\u043b\u043e\u0438 GPU', ar: '\u0637\u0642\u0627\u062a GPU' },
  'maxTokens': { 'pt-BR': 'Max Tokens', en: 'Max Tokens', es: 'Tokens M\u00e1ximos', fr: 'Tokens Max', de: 'Max Tokens', 'zh-CN': '\u6700\u5927 Token', ja: '\u6700\u5927\u30c8\u30fc\u30af\u30f3', ko: '\ucd5c\ub300 \ud1a0\ud06c', ru: '\u041c\u0430\u043a\u0441. \u0442\u043e\u043a\u0435\u043d\u043e\u0432', ar: '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0631\u0645\u0648\u0632' },
  'temperature': { 'pt-BR': 'Temperatura', en: 'Temperature', es: 'Temperatura', fr: 'Temp\u00e9rature', de: 'Temperatur', 'zh-CN': '\u6e29\u5ea6', ja: '\u6e29\u5ea6', ko: '\uc628\ub3c4', ru: '\u0422\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440\u0430', ar: '\u062f\u0631\u062c\u0629 \u0627\u0644\u062d\u0631\u0627\u0631\u0629' },
  'noModelLoaded': { 'pt-BR': 'Nenhum modelo carregado', en: 'No model loaded', es: 'Ning\u00fan modelo cargado', fr: 'Aucun mod\u00e8le charg\u00e9', de: 'Kein Modell geladen', 'zh-CN': '\u672a\u52a0\u8f7d\u6a21\u578b', ja: '\u30e2\u30c7\u30eb\u304c\u8aad\u307f\u8fbc\u307e\u308c\u3066\u3044\u307e\u305b\u3093', ko: '\ubaa8\ub378\uc774 \ub85c\ub4dc\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4', ru: '\u041c\u043e\u0434\u0435\u043b\u044c \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d', ar: '\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0623\u064a \u0646\u0645\u0648\u0630\u062c' },
  'loadModel': { 'pt-BR': 'Load Model', en: 'Load Model', es: 'Cargar Modelo', fr: 'Charger le mod\u00e8le', de: 'Modell laden', 'zh-CN': '\u52a0\u8f7d\u6a21\u578b', ja: '\u30e2\u30c7\u30eb\u3092\u8aad\u307f\u8fbc\u307f', ko: '\ubaa8\ub378 \ub85c\ub4dc', ru: '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043c\u043e\u0434\u0435\u043b\u044c', ar: '\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062c' },
  'comparing': { 'pt-BR': 'Compara\u00e7\u00e3o', en: 'Comparison', es: 'Comparaci\u00f3n', fr: 'Comparaison', de: 'Vergleich', 'zh-CN': '\u6bd4\u8f83', ja: '\u6bd4\u8f83', ko: '\ube44\uad50', ru: '\u0421\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u0435', ar: '\u0645\u0642\u0627\u0631\u0646\u0629' },
  'searchModels': { 'pt-BR': 'Search models...', en: 'Search models...', es: 'Buscar modelos...', fr: 'Rechercher des mod\u00e8les...', de: 'Modelle suchen...', 'zh-CN': '\u641c\u7d22\u6a21\u578b...', ja: '\u30e2\u30c7\u30eb\u3092\u691c\u7d22...', ko: '\ubaa8\ub378 \uac80\uc0c9...', ru: '\u041f\u043e\u0438\u0441\u043a \u043c\u043e\u0434\u0435\u043b\u0435\u0439...', ar: '\u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0646\u0645\u0627\u0630\u062c...' },
  'cancel': { 'pt-BR': 'Cancelar', en: 'Cancel', es: 'Cancelar', fr: 'Annuler', de: 'Abbrechen', 'zh-CN': '\u53d6\u6d88', ja: '\u30ad\u30e3\u30f3\u30bb\u30eb', ko: '\ucde8\uc18c', ru: '\u041e\u0442\u043c\u0435\u043d\u0430', ar: '\u0625\u0644\u063a\u0627\u0621' },
  'loadingModel': { 'pt-BR': 'Carregando modelo...', en: 'Loading model...', es: 'Cargando modelo...', fr: 'Chargement du mod\u00e8le...', de: 'Modell wird geladen...', 'zh-CN': '\u6b63\u5728\u52a0\u8f7d\u6a21\u578b...', ja: '\u30e2\u30c7\u30eb\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...', ko: '\ubaa8\ub378 \ub85c\ub54c \uc911...', ru: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043c\u043e\u0434\u0435\u043b\u0438...', ar: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062c...' },
  'systemPrompt': { 'pt-BR': 'Defina o comportamento do modelo nas requisi\u00e7\u00f5es da API...', en: 'Define model behavior for API requests...', es: 'Define el comportamiento del modelo...', fr: 'D\u00e9finissez le comportement du mod\u00e8le...', de: 'Modellverhalten definieren...', 'zh-CN': '\u5b9a\u4e49\u6a21\u578b\u5728 API \u8bf7\u6c42\u4e2d\u7684\u884c\u4e3a...', ja: 'API \u30ea\u30af\u30a8\u30b9\u30c8\u306e\u30e2\u30c7\u30eb\u52d5\u4f5c\u3092\u5b9a\u7fa9...', ko: 'API \uc694\uccad\uc5d0 \ub300\ud55c \ubaa8\ub378 \ud589\uc704 \uc815\uc758...', ru: '\u041e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435 \u043f\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u043c\u043e\u0434\u0435\u043b\u0438...', ar: '\u062d\u062f\u062f \u0633\u0644\u0648\u0643 \u0627\u0644\u0646\u0645\u0648\u0630\u062c \u0641\u064a \u0637\u0644\u0628\u0627\u062a API...' },
  'runtimeDesc': { 'pt-BR': 'Configura\u00e7\u00e3o do motor de infer\u00eancia', en: 'Inference engine configuration', es: 'Configuraci\u00f3n del motor de inferencia', fr: "Configuration du moteur d'inf\u00e9rence", de: 'Inferenz-Engine-Konfiguration', 'zh-CN': '\u63a8\u7406\u5f15\u64ce\u914d\u7f6e', ja: '\u63a8\u8ad6\u30a8\u30f3\u30b8\u30f3\u306e\u8a2d\u5b9a', ko: '\ud655\ub960 \uc5d4\uc9c4 \uc124\uc815', ru: '\u041a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u044f \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u044f \u0432\u044b\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0439', ar: '\u062a\u0639\u064a\u064a\u0646 \u0645\u062d\u0631\u0643 \u0627\u0644\u0627\u0633\u062a\u062f\u0644\u0627\u0644' },
  'runtimeSelections': { 'pt-BR': 'Runtime Selections', en: 'Runtime Selections', es: 'Selecciones de Runtime', fr: 'S\u00e9lections Runtime', de: 'Laufzeitauswahl', 'zh-CN': '\u8fd0\u884c\u65f6\u9009\u62e9', ja: '\u30e9\u30f3\u30bf\u30a4\u30e0\u9078\u629e', ko: '\ub7f0\ud0c0\uc784 \uc120\ud0dd', ru: '\u0412\u044b\u0431\u043e\u0440 \u0441\u0440\u0435\u0434\u044b \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f', ar: '\u062a\u062e\u0635\u064a\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644' },
  'compatibleOnly': { 'pt-BR': 'Apenas compat\u00edveis', en: 'Compatible only', es: 'Solo compatibles', fr: 'Compatible uniquement', de: 'Nur kompatible', 'zh-CN': '\u4ec5\u517c\u5bb9', ja: '\u5bfe\u5fdc\u3057\u3066\u3044\u308b\u307e\u3067', ko: '\ud638\ud658\ub41c \uac83\ub9cc', ru: '\u0422\u043e\u043b\u044c\u043a\u043e \u0441\u043e\u0432\u043c\u0435\u0441\u0442\u0438\u043c\u044b\u0435', ar: '\u0645\u062a\u0648\u0627\u0641\u0642\u064a\u0646 \u0641\u0642\u0637' },
  'allTypes': { 'pt-BR': 'Todos os tipos', en: 'All types', es: 'Todos los tipos', fr: 'Tous les types', de: 'Alle Typen', 'zh-CN': '\u6240\u6709\u7c7b\u578b', ja: '\u3059\u3079\u3066\u306e\u30bf\u30a4\u30d7', ko: '\ubaa8\ub4e0 \ud0c0\uc785', ru: '\u0412\u0441\u0435 \u0442\u0438\u043f\u044b', ar: '\u062c\u0645\u064a\u0639 \u0627\u0644\u0623\u0646\u0648\u0627\u0639' },
  'enginesFrameworks': { 'pt-BR': 'Engines & Frameworks', en: 'Engines & Frameworks', es: 'Motores y Frameworks', fr: 'Moteurs et Frameworks', de: 'Engines & Frameworks', 'zh-CN': '\u5f15\u64ce\u548c\u6846\u67b6', ja: '\u30a8\u30f3\u30b8\u30f3\u3068\u30d5\u30ec\u30fc\u30e0\u30ef\u30fc\u30af', ko: '\uc5d4\uc9c4 \ubc0f \ud504\ub808\uc784\uc6cc\ud06c', ru: '\u0414\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u0438 \u0438 \u0444\u0440\u0435\u0439\u043c\u0432\u043e\u0440\u043a\u0438', ar: '\u0627\u0644\u0645\u062d\u0631\u0643\u0627\u062a \u0648\u0627\u0644\u0625\u0637\u0627\u0631\u0632\u0627\u062a' },
  'enginesFrameworksDesc': { 'pt-BR': 'Motores e frameworks dispon\u00edveis', en: 'Available engines and frameworks', es: 'Motores y frameworks disponibles', fr: 'Moteurs et frameworks disponibles', de: 'Verf\u00fcgbare Engines und Frameworks', 'zh-CN': '\u53ef\u7528\u7684\u5f15\u64ce\u548c\u6846\u67b6', ja: '\u5229\u7528\u53ef\u80fd\u306a\u30a8\u30f3\u30b8\u30f3\u3068\u30d5\u30ec\u30fc\u30e0\u30ef\u30fc\u30af', ko: '\uc0ac\uc6a9 \uac00\ub2a5\ud55c \uc5d4\uc9c4 \ubc0f \ud504\ub808\uc784\uc6cc\ud06c', ru: '\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u0438 \u0438 \u0444\u0440\u0435\u0439\u043c\u0432\u043e\u0440\u043a\u0438', ar: '\u0627\u0644\u0645\u062d\u0631\u0643\u0627\u062a \u0648\u0627\u0644\u0625\u0637\u0627\u0631\u0632\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629' },
  'searchEllipsis': { 'pt-BR': 'Pesquisar...', en: 'Search...', es: 'Buscar...', fr: 'Rechercher...', de: 'Suchen...', 'zh-CN': '\u641c\u7d22...', ja: '\u691c\u7d22...', ko: '\uac80\uc0c9...', ru: '\u041f\u043e\u0438\u0441\u043a...', ar: '\u0628\u062d\u062b...' },
  'active': { 'pt-BR': 'Ativo', en: 'Active', es: 'Activo', fr: 'Actif', de: 'Aktiv', 'zh-CN': '\u6d3b\u8dc3', ja: '\u30a2\u30af\u30c6\u30a3\u30d6', ko: '\ud65c\uc131', ru: '\u0410\u043a\u0442\u0438\u0432\u043d\u043e', ar: '\u0646\u0634\u0637' },
  'latestVersion': { 'pt-BR': '\u00daltima vers\u00e3o', en: 'Latest version', es: '\u00daltima versi\u00f3n', fr: 'Derni\u00e8re version', de: 'Neueste Version', 'zh-CN': '\u6700\u65b0\u7248\u672c', ja: '\u6700\u65b0\u30d0\u30fc\u30b8\u30e7\u30f3', ko: '\ucd5c\uadfc \ubc84\uc804', ru: '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0432\u0435\u0440\u0441\u0438\u044f', ar: '\u0623\u062d\u062f\u064b \u0625\u0635\u062f\u0627\u0631' },
  'nonCompatible': { 'pt-BR': 'Incompat\u00edvel', en: 'Non Compatible', es: 'No compatible', fr: 'Non compatible', de: 'Nicht kompatibel', 'zh-CN': '\u4e0d\u517c\u5bb9', ja: '\u975e\u5bfe\u5fdc', ko: '\ud638\ud658\ub418\uc9c0 \uc54a\uc74c', ru: '\u041d\u0435 \u0441\u043e\u0432\u043c\u0435\u0441\u0442\u0438\u043c\u043e', ar: '\u063a\u064a\u0631 \u0645\u062a\u0648\u0627\u0641\u0642' },
  'gpuSurveyUnsuccessful': { 'pt-BR': 'An\u00e1lise de GPU malsucedida', en: 'GPU survey unsuccessful', fr: '\u00c9chec de l\'analyse GPU', de: 'GPU-Umfrage fehlgeschlagen', es: 'An\u00e1lisis de GPU fallido', 'zh-CN': 'GPU \u68c0\u6d4b\u5931\u8d25', ja: 'GPU \u8abf\u67fb\u5931\u6557', ko: 'GPU \uac80\uc0ac \uc2e4\ud328', ru: '\u041e\u043f\u0440\u043e\u0441 GPU \u043d\u0435 \u0443\u0434\u0430\u043b\u0441\u044f', ar: '\u0641\u0636\u0644 \u0645\u0633\u062d \u0627\u0644\u063a\u0631\u0627\u0641\u064a\u0643' },
  'noEnginesFound': { 'pt-BR': 'Nenhum engine encontrado', en: 'No engines found', es: 'No se encontraron motores', fr: 'Aucun moteur trouv\u00e9', de: 'Keine Engines gefunden', 'zh-CN': '\u672a\u627e\u5230\u5f15\u64ce', ja: '\u30a8\u30f3\u30b8\u30f3\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093', ko: '\uc5d4\uc9c4\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4', ru: '\u0414\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b', ar: '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u062d\u0631\u0643' },
  'cpuOnlyEngine': { 'pt-BR': 'Engine CPU-only llama.cpp', en: 'CPU-only llama.cpp engine', es: 'Motor llama.cpp solo CPU', fr: 'Moteur llama.cpp CPU uniquement', de: 'CPU-only llama.cpp Engine', 'zh-CN': '\u4ec5 CPU llama.cpp \u5f15\u64ce', ja: 'CPU\u4e13\u7528 llama.cpp \u30a8\u30f3\u30b8\u30f3', ko: 'CPU \uc785\uc7a5 llama.cpp \uc5d4\uc9c4', ru: '\u0414\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u044c llama.cpp \u0442\u043e\u043b\u044c\u043a\u043e CPU', ar: '\u0645\u062d\u0631\u0643 llama.cpp \u0645\u062d\u0638\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0627\u0644\u062c' },
  'vulkanEngine': { 'pt-BR': 'Engine Vulkan llama.cpp', en: 'Vulkan accelerated llama.cpp engine', es: 'Motor llama.cpp acelerado por Vulkan', fr: 'Moteur llama.cpp acc\u00e9l\u00e9r\u00e9 par Vulkan', de: 'Vulkan-beschleunigte llama.cpp Engine', 'zh-CN': 'Vulkan \u52a0\u901f llama.cpp \u5f15\u64ce', ja: 'Vulkan\u52a0\u901f llama.cpp \u30a8\u30f3\u30b8\u30f3', ko: 'Vulkan \uac00\uc18d llama.cpp \uc5d4\uc9c4', ru: '\u0423\u0441\u043a\u043e\u0440\u0435\u043d\u043d\u044b\u0439 Vulkan \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u044c llama.cpp', ar: '\u0645\u062d\u0631\u0643 llama.cpp \u0645\u0633\u0631\u0639 \u0628\u0641\u064a Vulkan' },
  'cudaEngine': { 'pt-BR': 'Engine CUDA llama.cpp', en: 'Nvidia CUDA accelerated llama.cpp engine', es: 'Motor llama.cpp acelerado por Nvidia CUDA', fr: 'Moteur llama.cpp acc\u00e9l\u00e9r\u00e9 par Nvidia CUDA', de: 'Nvidia CUDA-beschleunigte llama.cpp Engine', 'zh-CN': 'Nvidia CUDA \u52a0\u901f llama.cpp \u5f15\u64ce', ja: 'Nvidia CUDA\u52a0\u901f llama.cpp \u30a8\u30f3\u30b8\u30f3', ko: 'Nvidia CUDA \uac00\uc18d llama.cpp \uc5d4\uc9c4', ru: '\u0423\u0441\u043a\u043e\u0440\u0435\u043d\u043d\u044b\u0439 Nvidia CUDA \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u044c llama.cpp', ar: '\u0645\u062d\u0631\u0643 llama.cpp \u0645\u0633\u0631\u0639 \u0628\u0641\u064a Nvidia CUDA' },
  'cpu': { 'pt-BR': 'CPU', en: 'CPU', es: 'CPU', fr: 'CPU', de: 'CPU', 'zh-CN': 'CPU', ja: 'CPU', ko: 'CPU', ru: 'CPU', ar: '\u0627\u0644\u0645\u0639\u0627\u0644\u062c' },
  'compatible': { 'pt-BR': 'Compat\u00edvel', en: 'Compatible', es: 'Compatible', fr: 'Compatible', de: 'Kompatibel', 'zh-CN': '\u517c\u5bb9', ja: '\u5bfe\u5fdc', ko: '\ud638\ud658', ru: '\u0421\u043e\u0432\u043c\u0435\u0441\u0442\u0438\u043c\u043e', ar: '\u0645\u062a\u0648\u0627\u0641\u0642' },
  'name': { 'pt-BR': 'Nome', en: 'Name', es: 'Nombre', fr: 'Nom', de: 'Name', 'zh-CN': '\u540d\u79f0', ja: '\u540d\u524d', ko: '\uc774\ub984', ru: '\u0418\u043c\u044f', ar: '\u0627\u0644\u0627\u0633\u0645' },
  'architecture': { 'pt-BR': 'Arquitetura', en: 'Architecture', es: 'Arquitectura', fr: 'Architecture', de: 'Architektur', 'zh-CN': '\u67b6\u6784', ja: '\u30a2\u30fc\u30ad\u30c6\u30af\u30c1\u30e3', ko: '\uad6c\uc870', ru: '\u0410\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430', ar: '\u0627\u0644\u0647\u064a\u0643\u0644\u0629' },
  'memoryCapacity': { 'pt-BR': 'Capacidade de Mem\u00f3ria', en: 'Memory Capacity', es: 'Capacidad de Memoria', fr: 'Capacit\u00e9 M\u00e9moire', de: 'Speicherkapazit\u00e4t', 'zh-CN': '\u5185\u5b58\u5bb9\u91cf', ja: '\u30e1\u30e2\u30ea\u30fc\u5bb9\u91cf', ko: '\uba54\ubaa8\ub9ac \uc6a9\ub7c8', ru: '\u041e\u0431\u044a\u0435\u043c \u043f\u0430\u043c\u044f\u0442\u0438', ar: '\u0633\u0639\u0629 \u0627\u0644\u0630\u0627\u0643\u0631\u0629' },
  'ram': { 'pt-BR': 'RAM', en: 'RAM', es: 'RAM', fr: 'RAM', de: 'RAM', 'zh-CN': 'RAM', ja: 'RAM', ko: 'RAM', ru: 'RAM', ar: 'RAM' },
  'vram': { 'pt-BR': 'VRAM', en: 'VRAM', es: 'VRAM', fr: 'VRAM', de: 'VRAM', 'zh-CN': 'VRAM', ja: 'VRAM', ko: 'VRAM', ru: 'VRAM', ar: 'VRAM' },
  'gpus': { 'pt-BR': 'GPUs', en: 'GPUs', es: 'GPUs', fr: 'GPUs', de: 'GPUs', 'zh-CN': 'GPU', ja: 'GPU', ko: 'GPU', ru: 'GPU', ar: 'GPUs' },
  'off': { 'pt-BR': 'DESLIGADO', en: 'OFF', es: 'APAGADO', fr: 'OFF', de: 'AUS', 'zh-CN': '\u5173\u95ed', ja: '\u30aa\u30d5', ko: '\ucf4c', ru: '\u0412\u042b\u041a\u041b', ar: '\u0645\u063a\u0644\u0642' },
  'on': { 'pt-BR': 'LIGADO', en: 'ON', es: 'ENCENDIDO', fr: 'ON', de: 'AN', 'zh-CN': '\u5f00\u542f', ja: '\u30aa\u30f3', ko: '\uc624\ub118', ru: '\u0412\u041a\u041b', ar: '\u0645\u0634\u063a\u0644' },
  'noGpuDetected': { 'pt-BR': 'Nenhuma GPU detectada', en: 'No GPU detected', es: 'No se detect\u00f3 GPU', fr: 'Aucun GPU d\u00e9tect\u00e9', de: 'Keine GPU erkannt', 'zh-CN': '\u672a\u68c0\u6d4b\u5230 GPU', ja: 'GPU\u304c\u691c\u51fa\u3055\u308c\u307e\u305b\u3093', ko: 'GPU\uac00 \uac10\uc9c0\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4', ru: '\u0413\u0420\u0424\u041e\u041d\u0435 \u043d\u0435 \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d', ar: '\u0644\u0645 \u064a\u062a\u0645 \u0643\u0634\u0641 \u0639\u0646 \u063a\u0631\u0627\u0641\u064a\u0643' },
  'offloadKVCache': { 'pt-BR': 'Offload KV Cache para mem\u00f3ria GPU', en: 'Offload KV Cache to GPU Memory', es: 'Descargar KV Cache a memoria GPU', fr: 'D\u00e9charger le KV Cache en m\u00e9moire GPU', de: 'KV Cache in GPU-Speicher auslagern', 'zh-CN': 'KV Cache \u5378\u8f7d\u5230 GPU \u5185\u5b58', ja: 'KV Cache \u3092 GPU \u30e1\u30e2\u30ea\u306b\u30aa\u30d5\u30ed\u30fc\u30c9', ko: 'KV Cache \ub97c GPU \uba54\ubaa8\ub9ac\ub85c \uc624\ud504\ub85c\ub4dc', ru: '\u0412\u044b\u0433\u0440\u0443\u0437\u043a\u0430 KV \u043a\u044d\u0448\u0430 \u0432 \u043f\u0430\u043c\u044f\u0442\u044c GPU', ar: '\u062a\u062d\u0645\u064a\u0644 KV Cache \u0625\u0644\u0649 \u0630\u0627\u0643\u0631\u0629 GPU' },
  'resourceMonitor': { 'pt-BR': 'Monitor de Recursos', en: 'Resource Monitor', es: 'Monitor de Recursos', fr: 'Moniteur de Ressources', de: 'Ressourcenmonitor', 'zh-CN': '\u8d44\u6e90\u76d1\u89c6\u5668', ja: '\u30ea\u30bd\u30fc\u30b9\u30e2\u30cb\u30bf\u30fc', ko: '\uc790\uc6d0 \ubaa8\ub2c8\ud130', ru: '\u041c\u043e\u043d\u0438\u0442\u043e\u0440 \u0440\u0435\u0441\u0443\u0440\u0441\u043e\u0432', ar: '\u0645\u0631\u0627\u0642\u0628 \u0627\u0644\u0645\u0648\u0627\u0631\u062f' },
  'guardrails': { 'pt-BR': 'Guardrails', en: 'Guardrails', es: 'Guardrails', fr: 'Gardes-fou', de: 'Guardrails', 'zh-CN': '\u5b89\u5168\u9650\u5236', ja: '\u30ac\u30fc\u30c9\u30ec\u30a4\u30eb', ko: '\uac00\ub514\uc5b4\ub7ec\ub4dc', ru: '\u041e\u0433\u0440\u0430\u043d\u0438\u0447\u0438\u0442\u0435\u043b\u0438', ar: '\u062d\u0631\u0627\u0633\u0623\u0645\u0627\u0646' },
  'guardrailsDesc': { 'pt-BR': 'Prote\u00e7\u00f5es de carregamento de modelo', en: 'Model loading protections', es: 'Protecciones de carga de modelo', fr: 'Protections de chargement de mod\u00e8le', de: 'Modell-Ladeschutz', 'zh-CN': '\u6a21\u578b\u52a0\u8f7d\u4fdd\u62a4', ja: '\u30e2\u30c7\u30eb\u30ed\u30fc\u30c9\u4fdd\u8b77', ko: '\ubaa8\ub378 \ub85c\ub4dc \ubcf4\ud638', ru: '\u0417\u0430\u0449\u0438\u0442\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u043c\u043e\u0434\u0435\u043b\u0438', ar: '\u062d\u0645\u0627\u064a\u0627\u062a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062c' },
  'guardOff': { 'pt-BR': 'DESLIGADO', en: 'OFF', es: 'APAGADO', fr: 'D\u00c9SACTIV\u00c9', de: 'AUS', 'zh-CN': '\u5173\u95ed', ja: '\u30aa\u30d5', ko: '\ucf4c', ru: '\u0412\u042b\u041a\u041b', ar: '\u0645\u063a\u0644\u0642' },
  'guardOffDesc': { 'pt-BR': 'Sem precau\u00e7\u00f5es contra sobrecarga do sistema', en: 'No system overload precautions', es: 'Sin precauciones contra sobrecarga del sistema', fr: 'Aucune pr\u00e9caution contre la surcharge', de: 'Keine Vorkehrungen gegen \u00dcberlastung', 'zh-CN': '\u65e0\u7cfb\u7edf\u8d85\u8f7d\u9884\u9632\u63aa\u65bd', ja: '\u30b7\u30b9\u30c6\u30e0\u30aa\u30fc\u30d0\u30fc\u30ed\u30fc\u30c9\u3078\u306e\u5bfe\u7b56\u306a\u3057', ko: '\uc2dc\uc2a4\ud15c \uc624\ubc84\ub860 \uc694\uc57d \uc5c6\uc774', ru: '\u0411\u0435\u0437 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u043e\u0440\u043e\u0436\u043d\u043e\u0441\u0442\u0435\u0439 \u043f\u0440\u043e\u0442\u0438\u0432 \u043f\u0435\u0440\u0435\u0433\u0440\u0443\u0437\u043a\u0438', ar: '\u0628\u062f\u0648\u0646 \u062d\u0630\u0631 \u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u0646\u0638\u0627\u0645' },
  'guardRelaxed': { 'pt-BR': 'Relaxado', en: 'Relaxed', es: 'Relajado', fr: 'D\u00e9contract\u00e9', de: 'Entspannt', 'zh-CN': '\u5bbd\u677e', ja: '\u7de8\u306e\u307b\u3068\u3093\u3069', ko: '\ud655\uc0ac', ru: '\u0420\u0430\u0441\u0441\u043b\u0430\u0431\u043b\u0435\u043d\u043d\u044b\u0439', ar: '\u0645\u0633\u062a\u0631\u062d\u0644' },
  'guardRelaxedDesc': { 'pt-BR': 'Precau\u00e7\u00f5es leves contra sobrecarga do sistema', en: 'Light system overload precautions', es: 'Precauciones ligeras contra sobrecarga', fr: 'Pr\u00e9cautions l\u00e9g\u00e8res contre la surcharge', de: 'Leichte Vorkehrungen gegen \u00dcberlastung', 'zh-CN': '\u8f7b\u5fae\u7cfb\u7edf\u8d85\u8f7d\u9884\u9632\u63aa\u65bd', ja: '\u30b7\u30b9\u30c6\u30e0\u30aa\u30fc\u30d0\u30fc\u30ed\u30fc\u30c9\u3078\u306e\u8efd\u306a\u5bfe\u7b56', ko: '\uac70\ub2e4\uc6b4 \uc2dc\uc2a4\ud15c \uc624\ubc84\ub860 \uc694\uc57d', ru: '\u041b\u0451\u0433\u043a\u0438\u0435 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u043e\u0440\u043e\u0436\u043d\u043e\u0441\u0442\u0438', ar: '\u062d\u0630\u0631 \u062e\u0641\u064a\u0641 \u0639\u0644\u0649 \u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u0646\u0638\u0627\u0645' },
  'guardBalanced': { 'pt-BR': 'Equilibrado', en: 'Balanced', es: 'Equilibrado', fr: '\u00c9quilibr\u00e9', de: 'Ausgewogen', 'zh-CN': '\u5e73\u8861', ja: '\u30d0\u30e9\u30f3\u30b9', ko: '\ud3c9\uae40', ru: '\u0421\u0431\u0430\u043b\u0430\u043d\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439', ar: '\u0645\u062a\u0648\u0627\u0632\u0646' },
  'guardBalancedDesc': { 'pt-BR': 'Precau\u00e7\u00f5es moderadas contra sobrecarga do sistema', en: 'Moderate system overload precautions', es: 'Precauciones moderadas contra sobrecarga', fr: 'Pr\u00e9cautions mod\u00e9r\u00e9es contre la surcharge', de: 'M\u00e4\u00dfige Vorkehrungen gegen \u00dcberlastung', 'zh-CN': '\u4e2d\u7b49\u7cfb\u7edf\u8d85\u8f7d\u9884\u9632\u63aa\u65bd', ja: '\u30b7\u30b9\u30c6\u30e0\u30aa\u30fc\u30d0\u30fc\u30ed\u30fc\u30c9\u3078\u306e\u9069\u5ea6\u306a\u5bfe\u7b56', ko: '\uc900\ub9d0\ud55c \uc2dc\uc2a4\ud15c \uc624\ubc84\ub860 \uc694\uc57d', ru: '\u0423\u043c\u0435\u0440\u0435\u043d\u043d\u044b\u0435 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u043e\u0440\u043e\u0436\u043d\u043e\u0441\u0442\u0438', ar: '\u062d\u0630\u0631 \u0645\u064f\u062a\u0648\u0633\u0637\u0629 \u0639\u0644\u0649 \u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u0646\u0638\u0627\u0645' },
  'guardConservative': { 'pt-BR': 'Conservador', en: 'Conservative', es: 'Conservador', fr: 'Conservateur', de: 'Konservativ', 'zh-CN': '\u4fdd\u5b88', ja: '\u4fdd\u5b88\u7684', ko: '\uc8fc\uc758', ru: '\u041a\u043e\u043d\u0441\u0435\u0440\u0432\u0430\u0442\u0438\u0432\u043d\u044b\u0439', ar: '\u0645\u062d\u0627\u0641\u0638' },
  'guardConservativeDesc': { 'pt-BR': 'Precau\u00e7\u00f5es fortes contra sobrecarga do sistema', en: 'Strong system overload precautions', es: 'Precauciones fuertes contra sobrecarga', fr: 'Pr\u00e9cautions fortes contre la surcharge', de: 'Starke Vorkehrungen gegen \u00dcberlastung', 'zh-CN': '\u5f3a\u7cfb\u7edf\u8d85\u8f7d\u9884\u9632\u63aa\u65bd', ja: '\u30b7\u30b9\u30c6\u30e0\u30aa\u30fc\u30d0\u30fc\u30ed\u30fc\u30c9\u3078\u306e\u5f37\u3044\u5bfe\u7b56', ko: '\uac15\ub825\ud55c \uc2dc\uc2a4\ud15c \uc624\ubc84\ub860 \uc694\uc57d', ru: '\u0421\u0438\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u043e\u0440\u043e\u0436\u043d\u043e\u0441\u0442\u0438', ar: '\u062d\u0630\u0631 \u0642\u0648\u064a\u0629 \u0639\u0644\u0649 \u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u0646\u0638\u0627\u0645' },
  'loading': { 'pt-BR': 'Carregando...', en: 'Loading...', es: 'Cargando...', fr: 'Chargement...', de: 'Laden...', 'zh-CN': '\u52a0\u8f7d\u4e2d...', ja: '\u8aad\u307f\u8fbc\u307f\u4e2d...', ko: '\ub85c\ub4dc \uc911...', ru: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...', ar: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644...' },
  'airllm': { 'pt-BR': 'AirLLM', en: 'AirLLM', es: 'AirLLM', fr: 'AirLLM', de: 'AirLLM', 'zh-CN': 'AirLLM', ja: 'AirLLM', ko: 'AirLLM', ru: 'AirLLM', ar: 'AirLLM' },
  'airllmDesc': { 'pt-BR': 'Infer\u00eancia de baixa mem\u00f3ria para modelos grandes', en: 'Low memory inference for large models', es: 'Inferencia de baja memoria para modelos grandes', fr: 'Inf\u00e9rence \u00e0 faible m\u00e9moire pour les grands mod\u00e8les', de: 'Speichereffiziente Inferenz f\u00fcr gro\u00dfe Modelle', 'zh-CN': '\u5927\u6a21\u578b\u4f4e\u5185\u5b58\u63a8\u7406', ja: '\u5927\u578b\u30e2\u30c7\u30eb\u306e\u4f4e\u30e1\u30e2\u30ea\u63a8\u8ad6', ko: '\ud06c\uae00 \ubaa8\ub378\uc758 \uc800\uba54\ub9ac \ucd94\uc57d', ru: '\u0418\u043d\u0444\u0435\u0440\u0435\u043d\u0446\u0438\u044f \u0441 \u043c\u0430\u043b\u044b\u043c \u043f\u043e\u0442\u0440\u0435\u0431\u043b\u0435\u043d\u0438\u0435\u043c \u043f\u0430\u043c\u044f\u0442\u0438', ar: '\u0627\u0633\u062a\u0646\u062a\u0627\u062c \u0645\u0646\u0641\u0638 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0644\u0644\u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0643\u0628\u064a\u0631\u0629' },
  'airllmStatus': { 'pt-BR': 'Estado', en: 'Status', es: 'Estado', fr: 'Statut', de: 'Status', 'zh-CN': '\u72b6\u6001', ja: '\u30b9\u30c6\u30fc\u30bf\u30b9', ko: '\uc0c1\ud0dc', ru: '\u0421\u0442\u0430\u0442\u0443\u0441', ar: '\u062d\u0627\u0644\u0629' },
  'airllmActive': { 'pt-BR': 'AirLLM ativo', en: 'AirLLM active', es: 'AirLLM activo', fr: 'AirLLM actif', de: 'AirLLM aktiv', 'zh-CN': 'AirLLM \u5df2\u542f\u7528', ja: 'AirLLM \u30a2\u30af\u30c6\u30a3\u30d6', ko: 'AirLLM \ud65c\uc131', ru: 'AirLLM \u0430\u043a\u0442\u0438\u0432\u0435\u043d', ar: 'AirLLM \u0646\u0634\u0637' },
  'airllmInstalling': { 'pt-BR': 'Instalando AirLLM...', en: 'Installing AirLLM...', es: 'Instalando AirLLM...', fr: 'Installation d\'AirLLM...', de: 'AirLLM wird installiert...', 'zh-CN': '\u5b89\u88c5 AirLLM \u4e2d...', ja: 'AirLLM \u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u4e2d...', ko: 'AirLLM \uc124\uce58 \uc911...', ru: '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 AirLLM...', ar: '\u062c\u0627\u0631\u064a \u062a\u062b\u0628\u064a\u062a AirLLM...' },
  'required': { 'pt-BR': 'necess\u00e1ria', en: 'required', es: 'necesaria', fr: 'requis', de: 'erforderlich', 'zh-CN': '\u6240\u9700', ja: '\u5fc5\u8981', ko: '\ud544\uc694', ru: '\u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e', ar: '\u0645\u0637\u0644\u0648\u0628' },
  'available': { 'pt-BR': 'dispon\u00edvel', en: 'available', es: 'disponible', fr: 'disponible', de: 'verf\u00fcgbar', 'zh-CN': '\u53ef\u7528', ja: '\u5229\u7528\u53ef\u80fd', ko: '\uc0ac\uc6a9 \uac00\ub2a5', ru: '\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e', ar: '\u0645\u062a\u0627\u062d' },
  'deleteModelConfirm': { 'pt-BR': 'Eliminar o modelo', en: 'Delete model', es: 'Eliminar modelo', fr: 'Supprimer le mod\u00e8le', de: 'Modell l\u00f6schen', 'zh-CN': '\u5220\u9664\u6a21\u578b', ja: '\u30e2\u30c7\u30eb\u3092\u524a\u9664', ko: '\ubaa8\ub378 \uc0ad\uc81c', ru: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u043e\u0434\u0435\u043b\u044c', ar: '\u062d\u0630\u0641 \u0627\u0644\u0646\u0645\u0648\u0630\u062c' },
  'download': { 'pt-BR': 'Download', en: 'Download', es: 'Descargar', fr: 'T\u00e9l\u00e9charger', de: 'Herunterladen', 'zh-CN': '\u4e0b\u8f7d', ja: '\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9', ko: '\ub2e4\uc6b4\ub85c\ub4dc', ru: '\u0421\u043a\u0430\u0447\u0430\u0442\u044c', ar: '\u062a\u062d\u0645\u064a\u0644' },
  'airllmPythonMissing': { 'pt-BR': 'Python n\u00e3o detectado', en: 'Python not detected', es: 'Python no detectado', fr: 'Python non d\u00e9tect\u00e9', de: 'Python nicht erkannt', 'zh-CN': '\u672a\u68c0\u6d4b\u5230 Python', ja: 'Python \u304c\u691c\u51fa\u3055\u308c\u306a\u3044', ko: 'Python \uc5c6\uc774', ru: 'Python \u043d\u0435 \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d', ar: '\u0644\u0645 \u064a\u062a\u0645 \u0643\u0634\u0641 Python' },
  'airllmNotInstalled': { 'pt-BR': 'AirLLM n\u00e3o instalado', en: 'AirLLM not installed', es: 'AirLLM no instalado', fr: 'AirLLM non install\u00e9', de: 'AirLLM nicht installiert', 'zh-CN': '\u672a\u5b89\u88c5 AirLLM', ja: 'AirLLM \u304c\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u3055\u308c\u3066\u3044\u307e\u305b\u3093', ko: 'AirLLM \uc124\uce58 \uc54a\uc558\uc74c', ru: 'AirLLM \u043d\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d', ar: 'AirLLM \u063a\u064a\u0631 \u0645\u062b\u0628\u062a' },
  'airllmDesc2': { 'pt-BR': 'Permite correr modelos grandes (70B+) em GPUs com pouca VRAM sem quantização. Útil para modelos de imagem e vídeo em PCs fracos.', en: 'Run large models (70B+) on GPUs with little VRAM without quantization. Useful for image and video models on weak PCs.', es: 'Ejecutar modelos grandes (70B+) en GPUs con poca VRAM sin cuantización. Útil para modelos de imagen y video en PC débiles.', fr: 'Exécuter de grands modèles (70B+) sur GPU avec peu de VRAM sans quantification. Utile pour les modèles d\'image et vidéo sur PC faibles.', de: 'Große Modelle (70B+) auf GPUs mit wenig VRAM ohne Quantisierung ausführen. Nützlich für Bild- und Videomodell auf schwachen PCs.', 'zh-CN': '在少量 VRAM 的 GPU 上运行大模型 (70B+)，无需量化。适用于弱 PC 上的图像和视频模型。', ja: '少量の VRAM の GPU で大型モデル (70B+) を量子化なしに実行。弱い PC の画像・ビデオモデルに便利。', ko: 'VRAM이 적은 GPU에서 모델(70B+)을 양자화 없이 실행. 저사양 PC의 이미지/비디오 모델에 유용.', ru: 'Запуск больших моделей (70B+) на GPU с малой VRAM без квантования. Подходит для моделей изображений и видео на слабых PC.', ar: 'تشغيل نماذج كبيرة (70B+) على GPU بذاكرة VRAM محدودة بدون تكميم. مفيد لنماذج الصور والفيديو على الحاسبات الضعيفة.' },
  'creditsSupport': { 'pt-BR': 'Créditos e Apoio', en: 'Credits & Support', es: 'Créditos y Soporte', fr: 'Crédits et Support', de: 'Credits & Support', 'zh-CN': '致谢与支持', ja: 'クレジット＆サポート', ko: '크레딧 및 지원', ru: 'Благодарности и поддержка', ar: 'الاعتمادات والدعم' },
  'creditsSupportDesc': { 'pt-BR': 'Apoie o projeto e saiba mais', en: 'Support the project and learn more', es: 'Apoya el proyecto y aprende más', fr: 'Soutenez le projet et en savoir plus', de: 'Unterstützen Sie das Projekt und erfahren Sie mehr', 'zh-CN': '支持项目并了解更多信息', ja: 'プロジェクトを支援して詳しく見る', ko: '프로젝트를 지원하고 자세히 알아보기', ru: 'Поддержите проект и узнайте больше', ar: 'ادعم المشروع واعرف المزيد' },
  'about': { 'pt-BR': 'Sobre', en: 'About', es: 'Acerca de', fr: 'À propos', de: 'Über', 'zh-CN': '关于', ja: '概要', ko: '정보', ru: 'О проекте', ar: 'حول' },
  'aboutDesc': { 'pt-BR': 'Talos LLM Studio é um aplicativo de desktop para executar modelos de linguagem localmente, sem internet, sem limites. Privacidade total.', en: 'Talos LLM Studio is a desktop app for running language models locally, no internet, no limits. Total privacy.', es: 'Talos LLM Studio es una aplicación de escritorio para ejecutar modelos de lenguaje localmente, sin internet, sin límites. Privacidad total.', fr: 'Talos LLM Studio est une application de bureau pour exécuter des modèles de langage localement, pas d\'internet, pas de limites. Confidentialité totale.', de: 'Talos LLM Studio ist eine Desktop-App zum lokalen Ausführen von Sprachmodellen, kein Internet, keine Grenzen. Totale Privatsphäre.', 'zh-CN': 'Talos LLM Studio 是一款桌面应用，可本地运行语言模型，无需互联网，无限制。完全隐私。', ja: 'Talos LLM Studio はローカルで言語モデルを実行するデスクトップアプリ。インターネット不要、制限なし。完全なプライバシー。', ko: 'Talos LLM Studio는 언어 모델을 로컬에서 실행하는 데스크톱 앱입니다. 인터넷 불필요, 제한 없음. 완전한 프라이버시.', ru: 'Talos LLM Studio — это настольное приложение для локального запуска языковых моделей, без интернета, без ограничений. Полная конфиденциальность.', ar: 'Talos LLM Studio تطبيق سطح مكتب لتشغيل نماذج اللغة محليًا، بدون إنترنت، بدون قيود. خصوصية تامة.' },
  'support': { 'pt-BR': 'Apoio', en: 'Support', es: 'Soporte', fr: 'Support', de: 'Support', 'zh-CN': '支持', ja: 'サポート', ko: '지원', ru: 'Поддержка', ar: 'الدعم' },
  'supportDesc': { 'pt-BR': 'Encontrou um problema ou tem uma sugestão? Abra uma issue no GitHub.', en: 'Found an issue or have a suggestion? Open a GitHub issue.', es: '¿Encontraste un problema o tienes una sugerencia? Abre un issue en GitHub.', fr: 'Vous avez trouvé un problème ou avez une suggestion ? Ouvrez une issue GitHub.', de: 'Ein Problem gefunden oder einen Vorschlag? Eröffnen Sie ein GitHub-Issue.', 'zh-CN': '遇到问题或有建议？请在 GitHub 上提交 issue。', ja: '問題の発見や提案がありますか？GitHub で issue を開いてください。', ko: '문제를 발견했거나 제안이 있으신가요? GitHub에서 issue를 열어주세요.', ru: 'Нашли проблему или есть предложение? Откройте issue на GitHub.', ar: 'وجدت مشكلة أو لديك اقتراح؟ افتح issue على GitHub.' },
  'reportIssue': { 'pt-BR': 'Reportar Issue', en: 'Report Issue', es: 'Reportar Problema', fr: 'Signaler un Problème', de: 'Problem melden', 'zh-CN': '报告问题', ja: '問題を報告', ko: '문제 신고', ru: 'Сообщить о проблеме', ar: 'الإبلاغ عن مشكلة' },
  'donate': { 'pt-BR': 'Doar', en: 'Donate', es: 'Donar', fr: 'Faire un don', de: 'Spenden', 'zh-CN': '捐赠', ja: '寄付', ko: '기부', ru: 'Пожертвовать', ar: 'تبرع' },
  'donateDesc': { 'pt-BR': 'Se este projeto te ajudou, considere fazer uma doação para apoiar o desenvolvimento.', en: 'If this project helped you, consider making a donation to support development.', es: 'Si este proyecto te ayudó, considera hacer una donación para apoyar el desarrollo.', fr: 'Si ce projet vous a aidé, envisagez de faire un don pour soutenir le développement.', de: 'Wenn dieses Projekt Ihnen geholfen hat, erwägen Sie eine Spende zur Unterstützung der Entwicklung.', 'zh-CN': '如果这个项目帮助了您，请考虑捐赠以支持开发。', ja: 'このプロジェクトが役に立った場合は、開発支援をご検討ください。', ko: '이 프로젝트가 도움이 되었다면, 개발을 지원하기 위해 기부를 고려해 주세요.', ru: 'Если этот проект помог вам, рассмотрите возможность пожертвования для поддержки разработки.', ar: 'إذا كان هذا المشروع قد ساعدك، فكر في التبرع لدعم التطوير' },
};

let _lang = 'pt-BR';
function t(key: string): string { return STRINGS[key]?.[_lang] || STRINGS[key]?.['en'] || key; }
function setLang(lang: string) { _lang = lang; }

function CustomSelect({ value, onChange, options, style }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; disabled?: boolean }[]; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [open]);
  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="custom-select" style={{ position: 'relative', ...style }}>
      <div className="custom-select-trigger" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(prev => !prev); }}>
        <span>{selected?.label || value}</span>
        <IconChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </div>
      {open && ReactDOM.createPortal(
        <div className="custom-select-dropdown" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, minWidth: pos.width }}>
          {options.map(opt => (
            <div key={opt.value} className={`custom-select-option ${opt.value === value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}>
              {opt.value === value && <IconCheck size={14} />}
              <span>{opt.label}</span>
            </div>
          ))}
        </div>,
        document.body
                      )}
                    </div>
  );
}

function parseMediaContent(content: string): { text: string; media: { type: string; url: string }[] } {
  const media: { type: string; url: string }[] = [];
  let cleaned = content;
  const imgRegex = /!\[.*?\]\((.*?)\)|((https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp|bmp|svg))(\?[^\s]*)?)/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const url = match[1] || match[2];
    if (url) media.push({ type: 'image', url });
  }
  cleaned = cleaned.replace(imgRegex, '');
  const vidRegex = /((https?:\/\/[^\s]+\.(mp4|webm|ogg|mov))(\?[^\s]*)?)/gi;
  while ((match = vidRegex.exec(content)) !== null) {
    const url = match[1];
    if (url) media.push({ type: 'video', url });
  }
  cleaned = cleaned.replace(vidRegex, '');
  const modelRegex = /((https?:\/\/[^\s]+\.(glb|gltf|obj|stl|fbx|3ds|ply))(\?[^\s]*)?)/gi;
  while ((match = modelRegex.exec(content)) !== null) {
    const url = match[1];
    if (url) media.push({ type: '3d', url });
  }
  cleaned = cleaned.replace(modelRegex, '');
  const b64ImgRegex = /(data:image\/(png|jpg|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+)/gi;
  while ((match = b64ImgRegex.exec(content)) !== null) {
    media.push({ type: 'image', url: match[1] });
  }
  cleaned = cleaned.replace(b64ImgRegex, '');
  return { text: cleaned.trim(), media };
}

function MediaContent({ content }: { content: string }) {
  const { text, media } = parseMediaContent(content);
  const [viewer3dUrl, setViewer3dUrl] = useState<string | null>(null);
  return (
    <div>
      {text && <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>}
      {media.map((m, i) => {
        if (m.type === 'image') {
          return <img key={i} src={m.url} alt="" style={{ maxWidth: '256px', maxHeight: '256px', borderRadius: '8px', marginTop: '8px', cursor: 'pointer' }} onClick={() => window.open(m.url, '_blank')} />;
        }
        if (m.type === 'video') {
          return <video key={i} src={m.url} controls style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }} />;
        }
        if (m.type === '3d') {
          return (
            <div key={i} style={{ marginTop: '8px', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              {viewer3dUrl === m.url ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setViewer3dUrl(null)} style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>{'\u2715'}</button>
                  <iframe src={`https://modelviewer.dev/shared/models/robot.glb`} style={{ width: '100%', height: '400px', border: 'none' }} />
                </div>
              ) : (
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)' }}>
                  <IconBolt size={20} style={{ color: 'var(--text-muted)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.url.split('/').pop()}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>3D Model (.{m.url.split('.').pop()})</div>
                  </div>
                  <button onClick={() => window.open(m.url, '_blank')} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>{t('download')}</button>
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function App() {
  const [_langVersion, _setLangVersion] = useState(0);
  const [models, setModels] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState<{ loaded: boolean; path: string; name: string }>({ loaded: false, path: '', name: '' });
  const [activeView, setActiveView] = useState<View>('chat');
  const [showWelcome, setShowWelcome] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>(() => [{ id: newConvId(), title: 'New Chat', messages: [{ role: 'system', content: 'You are Talos. Always respond in the same language as the user.' }], createdAt: Date.now() }]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [settings, setSettings] = useState<any>({ theme: 'light', port: 1234, apiKey: 'talos-key-secret', nCtx: 4096, gpuLayers: 0 });
  const [serverRunning, setServerRunning] = useState(false);
  const [modelLoadError, setModelLoadError] = useState('');
  const [modelSizes, setModelSizes] = useState<Record<string, number>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showMcpList, setShowMcpList] = useState(false);
  const [mcpTools, setMcpTools] = useState<McpTool[]>(MCP_TOOLS);
  const [showHfModal, setShowHfModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [settingsView, setSettingsView] = useState('geral');
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [airllmStatus, setAirllmStatus] = useState<any>(null);
  const [airllmStarting, setAirllmStarting] = useState(false);
  const [airllmNotification, setAirllmNotification] = useState<any>(null);
  const [imageGenStatus, setImageGenStatus] = useState<any>(null);
  const [imageGenModel, setImageGenModel] = useState('sd-1.5');
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [imageGenServerStatus, setImageGenServerStatus] = useState<any>(null);
  const [installedImageGenModels, setInstalledImageGenModels] = useState<{ id: string; name: string; path: string }[]>([]);
  const imageGenBusy = useRef(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ path: string; type: string; name: string }[]>([]);
  const [runtimeEngine, setRuntimeEngine] = useState(settings.runtimeEngine || 'cpu');
  const [enginesList, setEnginesList] = useState<any[]>([]);
  const [runtimeSearch, setRuntimeSearch] = useState('');
  const [runtimeFilter, setRuntimeFilter] = useState('compatible');
  const [runtimeTypeFilter, setRuntimeTypeFilter] = useState('all');
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverInfoTab, setServerInfoTab] = useState('info');
  const [downloadProgress, setDownloadProgress] = useState<any>(null);
  const [showMiniDownload, setShowMiniDownload] = useState(false);
  const [hideMainCard, setHideMainCard] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showContextPopup, setShowContextPopup] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitModelB, setSplitModelB] = useState('');
  const [showSplitDropdownA, setShowSplitDropdownA] = useState(false);
  const [showSplitDropdownB, setShowSplitDropdownB] = useState(false);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [engineUpdates, setEngineUpdates] = useState<Record<string, { current: string; latest: string; hasUpdate: boolean; error?: string }>>({});

  const contextPopupRef = useRef<HTMLDivElement>(null);
  const [hfSearchQuery, setHfSearchQuery] = useState('');
  const [hfModels, setHfModels] = useState<HfModel[]>([]);
  const [hfSelectedModel, setHfSelectedModel] = useState<HfModel | null>(null);
  const [hfModelFiles, setHfModelFiles] = useState<HfModelFile[]>([]);
  const [hfSearching, setHfSearching] = useState(false);
  const [hfLoadingDetail, setHfLoadingDetail] = useState(false);
  const [hfError, setHfError] = useState('');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const [langDropdownPos, setLangDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const mcpRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];
  const messages = activeConv?.messages || [];
  const scrollToBottom = useCallback(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingText]);
  useEffect(() => { if (!activeConvId && conversations.length > 0) setActiveConvId(conversations[0].id); }, []);
  useEffect(() => { (window as any).talos.getHardwareInfo().then(setHardwareInfo).catch(() => {}); }, []);
  useEffect(() => {
    if (settingsView === 'hardware') {
      (window as any).talos.getAirllmStatus().then(setAirllmStatus).catch(() => {});
      (window as any).talos.getImageGenStatus().then(setImageGenStatus).catch(() => {});
    }
  }, [settingsView]);
  useEffect(() => {
    const unsub = (window as any).talos.onAirllmAutoActivated?.((info: any) => {
      setAirllmNotification(info);
      setTimeout(() => setAirllmNotification(null), 10000);
    });
    return () => { if (unsub) unsub(); };
  }, []);
  useEffect(() => {
    (window as any).talos.getEngineStatus().then(setEngineStatus).catch(() => {});
    const unsub = (window as any).talos.onEngineStatus?.((s: any) => setEngineStatus(s));
    return () => { if (unsub) unsub(); };
  }, []);
  useEffect(() => {
    if (!hardwareInfo) return;
    const gpu = hardwareInfo.gpu;
    const cpu = hardwareInfo.cpu;
    const engines = [
      {
        id: 'talos-engine',
        name: 'Talos Engine',
        platform: 'Windows',
        description: 'Motor nativo Go + llama.cpp de alta performance',
        version: '1.0.0',
        latestVersion: engineUpdates['talos-engine']?.latest || '1.0.0',
        status: engineUpdates['talos-engine']?.hasUpdate ? 'update' : 'latest',
        compatible: true,
        size: '20.5 MB',
        icon: 'zap',
        installed: true,
        type: 'engine',
      },
      {
        id: 'talos-cli',
        name: 'Talos CLI',
        platform: 'Windows',
        description: 'Wrapper Go independente com gestão de modelos e CLI',
        version: '1.0.0',
        latestVersion: engineUpdates['talos-cli']?.latest || '1.0.0',
        status: engineUpdates['talos-cli']?.hasUpdate ? 'update' : 'latest',
        compatible: true,
        size: '7.2 MB',
        icon: 'zap',
        installed: true,
        type: 'engine',
      },
      {
        id: 'cpu',
        name: 'CPU llama.cpp',
        platform: 'Windows',
        description: t('cpuOnlyEngine'),
        version: '2.23.1',
        latestVersion: engineUpdates['cpu']?.latest || '2.23.1',
        status: engineUpdates['cpu']?.hasUpdate ? 'update' : 'latest',
        compatible: true,
        size: null,
        icon: 'cpu',
        installed: true,
        type: 'runtime',
      },
      {
        id: 'vulkan',
        name: 'Vulkan llama.cpp',
        platform: 'Windows',
        description: t('vulkanEngine'),
        version: '2.23.1',
        latestVersion: engineUpdates['vulkan']?.latest || '2.23.1',
        status: engineUpdates['vulkan']?.hasUpdate ? 'update' : (gpu?.detected && (gpu.api === 'Vulkan' || gpu.api === 'DirectX') ? 'latest' : 'incompatible'),
        compatible: gpu?.detected && (gpu.api === 'Vulkan' || gpu.api === 'DirectX'),
        size: null,
        icon: 'zap',
        installed: false,
        type: 'runtime',
      },
      {
        id: 'cuda',
        name: 'CUDA llama.cpp',
        platform: 'Windows',
        description: t('cudaEngine'),
        version: '2.23.1',
        latestVersion: engineUpdates['cuda']?.latest || '2.23.1',
        status: engineUpdates['cuda']?.hasUpdate ? 'update' : (gpu?.detected && gpu.api === 'CUDA' ? 'latest' : 'incompatible'),
        compatible: gpu?.detected && gpu.api === 'CUDA',
        size: null,
        icon: 'zap',
        installed: false,
        type: 'runtime',
      },
      {
        id: 'airllm',
        name: 'AirLLM',
        platform: 'Windows',
        description: t('airllm'),
        version: airllmStatus?.airllmVersion || '-',
        latestVersion: engineUpdates['airllm']?.latest || airllmStatus?.airllmVersion || '-',
        status: engineUpdates['airllm']?.hasUpdate ? 'update' : (airllmStatus?.airllmInstalled ? 'latest' : 'incompatible'),
        compatible: airllmStatus?.pythonFound || false,
        size: null,
        icon: 'zap',
        installed: airllmStatus?.airllmInstalled || false,
        type: 'framework',
      },
    ];
    setEnginesList(engines);
  }, [hardwareInfo, airllmStatus]);
  useEffect(() => { const unsub = (window as any).talos.onDownloadProgress((p: any) => { if (p.done || p.cancelled) { setTimeout(() => { setDownloadProgress(null); setHideMainCard(false); }, 1500); return; } setDownloadProgress(p); }); return unsub; }, []);
  useEffect(() => { (window as any).talos.loadConversations().then((s: string) => { if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) { setConversations(p); setActiveConvId(p[0].id); } } }).catch(() => {}); }, []);
  useEffect(() => { if (conversations.length > 0) (window as any).talos.saveConversations(JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { window.talos.getModels().then(setModels); (window as any).talos.getInstalledImageGenModels?.().then((m: any) => setInstalledImageGenModels(m || [])).catch(() => {}); window.talos.getSettings().then(async (s: any) => { if (s) { document.documentElement.setAttribute('data-theme', s.theme || 'light'); if (!s.language) { try { const locale = await window.talos.getSystemLocale(); const code = locale?.split('-')[0]?.split('_')[0]?.toLowerCase(); const mapped = LOCALE_MAP[code || '']; if (mapped) s.language = mapped; } catch {} } setSettings(s); if (s.welcomeSeen) setShowWelcome(false); } }); window.talos.getModelStatus().then(setModelStatus); window.talos.getServerStatus().then((s: any) => setServerRunning(s.running)); const ut = window.talos.onChatToken((t: string) => setStreamingText((prev: string) => prev + t)); const ue = window.talos.onChatError((err: string) => { setIsGenerating(false); appendToActiveConv({ role: 'assistant', content: `Error: ${err}` }); });         const um = window.talos.onModelStatus((s: any) => setModelStatus(s)); const uig = window.talos.onImageGenStatus((s: any) => { setImageGenServerStatus(s); if (s.status === 'ready') setTimeout(() => setImageGenServerStatus(null), 2000); if (s.status === 'error') setTimeout(() => setImageGenServerStatus(null), 5000); }); return () => { ut(); ue(); um(); uig(); }; }, []);
  useEffect(() => { (window as any).talos.setSystemPrompt(settings.systemPrompt || ''); }, [settings.systemPrompt]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', settings.theme || 'light'); }, [settings.theme]);
  useEffect(() => { setLang(settings.language || 'en'); _setLangVersion((v: number) => v + 1); }, [settings.language]);
  useEffect(() => { function handleClickOutside(e: MouseEvent) { if (mcpRef.current && !mcpRef.current.contains(e.target as Node)) setShowMcpList(false); if (contextPopupRef.current && !contextPopupRef.current.contains(e.target as Node)) setShowContextPopup(false); if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) setShowLangDropdown(false); } document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);

  // Auto-check engine updates on startup
  useEffect(() => {
    checkEngineUpdates();
  }, []);

  function handleWelcomeDone() { setShowWelcome(false); const u = { ...settings, welcomeSeen: true }; setSettings(u); (window as any).talos.saveSettings(u); }
  function appendToActiveConv(msg: Message) { setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, messages: [...c.messages, msg], title: c.title === 'New Chat' && msg.role === 'user' ? msg.content.substring(0, 40) : c.title } : c)); }
  function newConversation() { const id = newConvId(); setConversations(prev => [...prev, { id, title: 'New Chat', messages: [{ role: 'system', content: 'You are Talos. Always respond in the same language as the user.' }], createdAt: Date.now() }]); setActiveConvId(id); setStreamingText(''); setIsGenerating(false); }
  function deleteConversation(id: string) { setConversations(prev => { const f = prev.filter(c => c.id !== id); if (f.length === 0) return [{ id: newConvId(), title: 'New Chat', messages: [], createdAt: Date.now() }]; return f; }); if (activeConvId === id) setActiveConvId(conversations.filter(c => c.id !== id)[0]?.id || ''); }
  async function refreshModels() { const list = await window.talos.getModels(); setModels(list); const sizes: Record<string, number> = {}; for (const m of list) sizes[m] = await window.talos.getModelSize(m); setModelSizes(sizes); }
  async function checkEngineUpdates() {
    try {
      const result = await (window as any).talos.checkEngineUpdates();
      setEngineUpdates(result);
      Object.keys(result).forEach(k => {
        if (result[k].hasUpdate) {
          console.log(`[TALOS] Update available for ${k}: ${result[k].current} -> ${result[k].latest}`);
        }
      });
    } catch (e: any) {
      console.error('[TALOS] checkEngineUpdates failed:', e);
    }
  }
  async function handleLoadModel(path: string) {
    const isImageGen = installedImageGenModels.some(m => m.id === path);
    if (isImageGen) {
      setImageGenModel(path);
      setShowImageGen(true);
      setModelLoadError('');
      setModelLoading(true);
      setModelLoadProgress(0);
      const iv = setInterval(() => setModelLoadProgress((prev: number) => prev >= 90 ? 90 : prev + Math.random() * 8), 500);
      try {
        const r = await (window as any).talos.imageGenLoadModel(path, true);
        clearInterval(iv);
        if (!r.success) setModelLoadError(r.error || 'Failed');
        else {
          setModelLoadProgress(100);
          setModelStatus({ loaded: true, path, name: installedImageGenModels.find(m => m.id === path)?.name || path });
          setTimeout(() => { setModelLoading(false); setModelLoadProgress(0); }, 1000);
        }
      } catch (err: any) {
        clearInterval(iv);
        setModelLoadError(err.message || 'Failed');
        setTimeout(() => { setModelLoading(false); setModelLoadProgress(0); }, 3000);
      }
      return;
    }
    setModelLoadError('');
    setModelLoading(true);
    setModelLoadProgress(0);
    let gpuLayersToUse = settings.gpuLayers || 0;
    const guard = settings.guardrails || 'balanced';
    if (guard !== 'off' && hardwareInfo) {
      const modelSizeMB = modelSizes[path] || 0;
      const totalRAMMB = (hardwareInfo.memory?.total || 0) * 1024;
      const usedRAMMB = (hardwareInfo.memory?.used || 0) * 1024;
      const freeRAMMB = totalRAMMB - usedRAMMB;
      const vramMB = hardwareInfo.gpu?.vramMB || 0;
      const limits: Record<string, number> = { relaxed: 0.85, balanced: 0.7, conservative: 0.5 };
      const memLimit = limits[guard] || 0.7;
      if (modelSizeMB > 0 && modelSizeMB > freeRAMMB * memLimit) {
        setModelLoadError(`Model too large for available memory. Needs ~${Math.round(modelSizeMB)}MB, ${Math.round(freeRAMMB)}MB free (limit: ${Math.round(memLimit * 100)}%)`);
        setModelLoading(false);
        return;
      }
      if (gpuLayersToUse > 0 && vramMB === 0) {
        gpuLayersToUse = 0;
      } else if (gpuLayersToUse > 0 && vramMB > 0 && modelSizeMB > 0) {
        const layerRatio = vramMB / (modelSizeMB * 0.8);
        const maxSafeLayers = Math.floor(gpuLayersToUse * Math.min(layerRatio, 1));
        if (guard === 'conservative') {
          gpuLayersToUse = Math.floor(maxSafeLayers * 0.5);
        } else if (guard === 'balanced') {
          gpuLayersToUse = Math.floor(maxSafeLayers * 0.75);
        } else {
          gpuLayersToUse = maxSafeLayers;
        }
      }
    }
    const iv = setInterval(() => setModelLoadProgress((prev: number) => prev >= 90 ? 90 : prev + Math.random() * 15), 500);
    try {
      const r = await window.talos.loadModel(path, { gpuLayers: gpuLayersToUse });
      clearInterval(iv);
      if (!r.success) setModelLoadError(r.error || 'Failed');
      else {
        setModelLoadProgress(100);
        setTimeout(() => { setModelLoading(false); setModelLoadProgress(0); }, 1000);
        if (!serverRunning) { await window.talos.startServer(settings.port, settings.apiKey); setServerRunning(true); }
      }
    } catch {
      clearInterval(iv);
      setModelLoading(false);
      setModelLoadProgress(0);
    }
  }
  async function handleUnload() { await window.talos.unloadModel(); }
  async function handleStop() { setIsGenerating(false); setStreamingText(''); try { await (window as any).talos.stopChat(); } catch {} }
  async function attachFiles() {
    try {
      const r = await (window as any).talos.selectFiles();
      if (r?.paths) {
        setAttachedFiles(prev => [...prev, ...r.paths.map((p: string) => ({
          path: p,
          type: p.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i) ? 'image/' : 'file/',
          name: p.split('\\').pop() || p
        }))]);
      }
    } catch {}
  }
  async function handleDonate() {
    const GHOSTPAY_SIGNING_KEY = '97e58881d4b73258776f2cf10a3be8494cbc3c1b65cfcf8cb92cded31f8ec7f8';
    const checkout = Checkout.fromJSON({
      receiver: { name: 'Ghost systems' },
      mode: 'custom',
      fixedCurrency: 'USD',
      supportedChains: ['bitcoin', 'ethereum', 'solana', 'polygon', 'bsc'],
      transactionMode: 'hosted',
      hostedPaymentUrl: 'https://ghostpay-systems.vercel.app/donate',
    });
    const link = checkout.generatePaymentLink('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 1, GHOSTPAY_SIGNING_KEY);
    await (window as any).talos.openExternal(link);
  }
  async function handleSend() {
    if (!input.trim() && attachedFiles.length === 0 || isGenerating || !modelStatus.loaded) return;
    const content = input.trim();
    const files = [...attachedFiles];
    const um: Message = { role: 'user', content: content + (files.length ? '\n' + files.map(f => `[${f.type.startsWith('image/') ? 'Image' : 'File'}: ${f.name} (${f.path})]`).join('\n') : '') };
    appendToActiveConv(um);
    setInput('');
    setAttachedFiles([]);
    setIsGenerating(true);
    setStreamingText('');
    try {
      const uc = conversations.find(c => c.id === activeConvId);
      const cm = uc ? [...uc.messages, um] : [um];
      const r = await window.talos.chatCompletion(cm, { temperature: settings.temperature || 0.7, max_tokens: settings.maxTokens || 2048 });
      appendToActiveConv({ role: 'assistant', content: r.text });
    } catch (err: any) {
      appendToActiveConv({ role: 'assistant', content: `Error: ${err.message || err}` });
    } finally {
      setIsGenerating(false);
      setStreamingText('');
    }
  }

  async function handleImageGen() {
    if (!input.trim() || imageGenBusy.current) return;
    imageGenBusy.current = true;
    const prompt = input.trim();
    const um: Message = { role: 'user', content: `[Image] ${prompt}` };
    appendToActiveConv(um);
    setInput('');
    setImageGenLoading(true);
    try {
      const result = await (window as any).talos.imageGenGenerate({ prompt, width: 512, height: 512, steps: 20, guidanceScale: 7.5 });
      if (result.success && result.image) {
        appendToActiveConv({ role: 'assistant', content: result.image });
      } else {
        appendToActiveConv({ role: 'assistant', content: `Error generating image: ${result.error || 'Unknown error'}` });
      }
    } catch (err: any) {
      appendToActiveConv({ role: 'assistant', content: `Error: ${err.message || err}` });
    } finally {
      imageGenBusy.current = false;
      setImageGenLoading(false);
    }
  }
  async function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const isImg = installedImageGenModels.some(m => m.id === modelStatus.path); if (isImg) { await handleImageGen(); } else { await handleSend(); } } }
  async function toggleServer() { if (serverRunning) { await window.talos.stopServer(); setServerRunning(false); } else { await window.talos.startServer(settings.port, settings.apiKey); setServerRunning(true); } }
  function toggleMcp(id: string) { setMcpTools(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t)); }
  async function hfSearch(query: string) { setHfSearching(true); setHfError(''); try { if (!query.trim()) { setHfModels(VERIFIED_MODELS); setHfSearching(false); return; } const r = await (window as any).talos.hfSearchModels(query, 'downloads', 50); if (r.error) { setHfError(r.error); setHfModels([]); } else { const ms: HfModel[] = r.map((m: any) => ({ id: m.id, modelId: m.id, author: m.id.split('/')[0] || '', name: m.id.split('/')[1] || m.id, description: m.description || '', downloads: m.downloads || 0, likes: m.likes || 0, lastModified: m.lastModified || '', tags: m.tags || [], pipeline_tag: m.pipeline_tag || '', verified: isVerifiedModel(m.id) })); ms.sort((a, b) => (a.verified && !b.verified ? -1 : !a.verified && b.verified ? 1 : 0)); setHfModels(ms); } } catch (err: any) { setHfError(err.message); setHfModels([]); } finally { setHfSearching(false); } }
  async function hfSelectModel(model: HfModel) { setHfSelectedModel(model); setHfModelFiles([]); setHfLoadingDetail(true); try { const r: any = await (window as any).talos.hfModelFiles(model.modelId); if (Array.isArray(r) && r.length > 0) setHfModelFiles(r.filter((f: any) => f.path?.endsWith('.gguf')).map((f: any) => ({ path: f.path, type: f.type || 'file', size: f.size || 0 }))); } catch {} finally { setHfLoadingDetail(false); } }
  async function hfDownloadFile(file: HfModelFile, modelId: string) { const url = `https://huggingface.co/${modelId}/resolve/main/${file.path}`; try { await (window as any).talos.downloadModel(url, file.path.split('/').pop() || file.path, modelId); await refreshModels(); } catch {} }
  function formatSize(bytes: number): string { if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'; if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'; if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'; return bytes + ' B'; }
  function cancelDownload() { setDownloadProgress(null); setShowMiniDownload(false); setHideMainCard(false); (window as any).talos.cancelDownload?.(); }
  function dismissDownload() { setHideMainCard(true); setShowMiniDownload(true); }

  const modelName = (p: string) => p.split('\\').pop()?.replace('.gguf', '') || p.split('/').pop()?.replace('.gguf', '') || 'Unknown';
  const totalTokens = messages.reduce((acc, m) => acc + estimateTokens(m.content || ''), 0) + estimateTokens(input || '');
  const contextPct = Math.min(Math.round((totalTokens / settings.nCtx) * 100), 100);
  const circumference = 2 * Math.PI * 12;
  const dashOffset = circumference * (1 - contextPct / 100);

  const avatarForModel = (m: string) => {
    const n = modelName(m).toLowerCase();
    if (n.includes('gemma')) return '/avatars/google.png';
    if (n.includes('qwen')) return '/avatars/qwen-color.png';
    if (n.includes('nemotron')) return '/avatars/nvidia.png';
    if (n.includes('lfm')) return '/avatars/liquidai.png';
    if (n.includes('glm')) return '/avatars/zhipuai.png';
    if (n.includes('ministral') || n.includes('mistral')) return '/avatars/mistral.png';
    if (n.includes('olm')) return '/avatars/allenai.png';
    if (n.includes('rnj')) return '/avatars/essentialai.png';
    if (n.includes('flux')) return '/avatars/flux-ai-icon.webp';
    if (n.includes('hunyuan')) return '/avatars/HunyuanVideo.avif';
    if (n.includes('ltx')) return '/avatars/HunyuanVideo.avif';
    if (n.includes('trellis')) return '/avatars/microsoft-color.png';
    if (n.includes('stable') || n.includes('sd')) return '/avatars/stability-ai.png';
    if (n.includes('deepseek')) return '/avatars/deepseek-color.png';
    return '/avatars/huggingface.svg';
  };

  const ModelDropdown = ({ selected, onSelect, disabled }: { selected: string; onSelect: (m: string) => void; disabled?: boolean }) => {
    const [open, setOpen] = useState(false);
    const allModels = [
      ...models.map(m => ({ id: m, label: modelName(m), type: 'text' as const })),
      ...installedImageGenModels.map(m => ({ id: m.id, label: m.name, type: 'image' as const })),
    ];
    const selectedModel = allModels.find(m => m.id === selected);
    return (
      <div className="model-dropdown-wrapper">
        <button className="model-dropdown-btn" onClick={() => setOpen(!open)} disabled={disabled}>
          {selected ? selectedModel?.label || selected : 'Select model...'}
        </button>
        {open && (
          <div className="model-dropdown-menu" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {allModels.length === 0 ? (
              <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>No models installed</div>
            ) : allModels.map(m => (
              <div key={m.id} className={`model-dropdown-item ${selected === m.id ? 'active' : ''}`} onClick={() => { onSelect(m.id); setOpen(false); }}>
                {m.type === 'image' ? <IconEye size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <img src={avatarForModel(m.id)} alt="" className="model-dropdown-avatar" />}
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {showWelcome ? (
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="welcome-logo"><img src="/logo.png" alt="Talos" style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '8px' }} /></div>
            <h1 className="welcome-title">{t('welcomeTitle')}</h1>
            <p className="welcome-desc">{t('welcomeDesc')}</p>
            <div className="welcome-features">
              <div className="welcome-feature"><IconMessage size={24} /><h3>{t('chats')}</h3><p>Converse com modelos de IA diretamente no seu computador.</p></div>
              <div className="welcome-feature"><IconServer2 size={24} /><h3>{t('server')}</h3><p>Sirva modelos via API OpenAI-compat\u00edvel.</p></div>
              <div className="welcome-feature"><IconDownload size={24} /><h3>{t('welcomeDownload') || 'Download'}</h3><p>Baixe modelos do Hugging Face com um clique.</p></div>
            </div>
            <button className="welcome-start-btn" onClick={handleWelcomeDone}><IconArrowRight size={18} /> {t('welcomeStart')}</button>
          </div>
        </div>
      ) : (
        <div className="app">
          <aside className="sidebar collapsed">
            <div className="sidebar-header"><img src="/logo.png" alt="Talos" className="sidebar-logo-mini" /></div>
            <nav className="sidebar-nav">
              <button className={`nav-btn ${activeView === 'robot' ? 'active' : ''}`} onClick={() => { setShowHfModal(true); if (hfModels.length === 0) setHfModels(VERIFIED_MODELS); }} title="Agente"><IconRobotFace size={18} /></button>
              <button className={`nav-btn ${activeView === 'models' ? 'active' : ''}`} onClick={() => setActiveView('models')} title={t('models')}><IconList size={18} /></button>
              <button className={`nav-btn ${activeView === 'chat' ? 'active' : ''}`} onClick={() => setActiveView('chat')} title={t('chat')}><IconMessage size={18} /></button>
              <button className={`nav-btn ${activeView === 'server' ? 'active' : ''}`} onClick={() => setActiveView('server')} title={t('server')}><IconServer2 size={18} /></button>
              <button className={`nav-btn ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')} title={t('settings')}><IconSettings size={18} /></button>
            </nav>
          </aside>
          {activeView === 'chat' && (
            <div className="sub-sidebar">
              <div className="sub-sidebar-header">
                <h3>{t('chats')}</h3>
                <div className="sub-sidebar-actions">
                  <button className="sub-icon-btn" onClick={newConversation} title="New Chat"><IconPencil size={16} /></button>
                  <button className="sub-icon-btn" title="More"><IconDotsVertical size={16} /></button>
                </div>
              </div>
              <div className="conv-list">
                {[...conversations].reverse().map(c => (
                  <div key={c.id} className={`conv-item ${c.id === activeConvId ? 'active' : ''}`} onClick={() => setActiveConvId(c.id)}>
                    <div className="conv-item-info"><span className="conv-title">{c.title}</span></div>
                    <button className="conv-delete" onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} title="Delete"><IconTrash size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <main className="main-content">
            {airllmNotification && (
              <div style={{ margin: '12px 16px 0', padding: '12px 16px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
                <IconBolt size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong>AirLLM {t('airllmActive')}</strong>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}> — {airllmNotification.reason} ({airllmNotification.modelSize}). {t('ram')}: {airllmNotification.neededRAM}GB {t('required')}, {airllmNotification.ramGB}GB {t('available')}. {airllmNotification.vramGB > 0 ? `VRAM: ${airllmNotification.neededVRAM}GB ${t('required')}, ${airllmNotification.vramGB}GB ${t('available')}.` : ''}</span>
                </div>
                <button onClick={() => setAirllmNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><IconX size={14} /></button>
              </div>
            )}
            {activeView === 'chat' && (
              <div className={`chat-view ${splitMode ? 'chat-split' : ''}`}>
                <div className="chat-topbar"><span></span><button className={`split-toggle-btn ${splitMode ? 'active' : ''}`} onClick={() => setSplitMode(!splitMode)} title={t('comparing')}><IconColumns2 size={16} /></button></div>
                {splitMode ? (
                  <div className="chat-split-panels">
                    <div className="chat-split-panel">
                      <div className="chat-split-panel-header"><span className="chat-split-model-name">{t('comparing')}</span></div>
                      <div className="chat-messages">
                        {messages.filter((m: Message) => m.role !== 'system').map((msg, i) => (<div key={i} className={`message ${msg.role}`}><div className="message-avatar">{msg.role === 'user' ? <IconUser size={16} /> : <IconRobot size={16} />}</div><div className="message-content"><MediaContent content={msg.content.replace(/<\|end\|>/g, '').replace(/<\|.*?\|>/g, '').trim()} /></div></div>))}
                        {isGenerating && streamingText && (<div className="message assistant"><div className="message-avatar"><IconRobot size={16} /></div><div className="message-content">{streamingText.replace(/<\|end\|>/g, '').replace(/<\|.*?\|>/g, '').trim()}<span className="cursor">{'\u258b'}</span></div></div>)}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="chat-input-wrapper">
                        {attachedFiles.length > 0 && (
                          <div className="attached-files-bar" style={{ display: 'flex', gap: '6px', padding: '6px 8px', flexWrap: 'wrap', background: 'var(--bg-secondary)', borderRadius: '8px 8px 0 0', borderBottom: '1px solid var(--border)' }}>
                            {attachedFiles.map((f, i) => (
                              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: '12px', fontSize: '12px' }}>
                                {f.type.startsWith('image/') ? <IconImageInPicture size={12} /> : <IconFile size={12} />}
                                {f.name}
                                <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>&times;</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="chat-input-container">
                          <textarea className="chat-input" placeholder="Send a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={!modelStatus.loaded || isGenerating} rows={1} />
                          <div className="chat-input-actions">
                            <div className="chat-input-left">
                              <button className="input-icon-btn" onClick={attachFiles}><IconPlus size={18} /></button>
                              <button className="input-icon-btn"><IconHammer size={18} /></button>
                              <button className="input-icon-btn" onClick={() => setShowImageGen(!showImageGen)} style={{ color: showImageGen ? 'var(--accent)' : undefined }}><IconEye size={18} /></button>
                              <ModelDropdown selected={modelStatus.path} onSelect={handleLoadModel} disabled={isGenerating} />
                            </div>
                            <div className="chat-input-right">
                              <button className="send-btn-circle" disabled={!input.trim() && attachedFiles.length === 0 || !modelStatus.loaded}><IconArrowRight size={18} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="chat-split-divider"></div>
                    <div className="chat-split-panel">
                      <div className="chat-split-panel-header"><span className="chat-split-model-name">{t('comparing')}</span></div>
                      <div className="chat-messages"><div className="chat-split-empty"><IconRobot size={32} /><span>{t('compareHint')}</span></div></div>
                      <div className="chat-input-wrapper">
                        <div className="chat-input-container">
                          <textarea className="chat-input" placeholder="Send a message..." disabled rows={1} />
                          <div className="chat-input-actions">
                            <div className="chat-input-left">
                              <button className="input-icon-btn" disabled><IconPlus size={18} /></button>
                              <button className="input-icon-btn" disabled><IconHammer size={18} /></button>
                              <ModelDropdown selected={splitModelB} onSelect={setSplitModelB} />
                            </div>
                            <div className="chat-input-right">
                              <button className="send-btn-circle" disabled={!splitModelB}><IconArrowRight size={18} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="chat-messages">
                       {messages.filter((m: Message) => m.role !== 'system').map((msg, i) => (<div key={i} className={`message ${msg.role}`}><div className="message-avatar">{msg.role === 'user' ? <IconUser size={16} /> : <IconRobot size={16} />}</div><div className="message-content"><MediaContent content={msg.content.replace(/<\|end\|>/g, '').replace(/<\|.*?\|>/g, '').trim()} /></div></div>))}
                      {isGenerating && streamingText && (<div className="message assistant"><div className="message-avatar"><IconRobot size={16} /></div><div className="message-content">{streamingText.replace(/<\|end\|>/g, '').replace(/<\|.*?\|>/g, '').trim()}<span className="cursor">{'\u258b'}</span></div></div>)}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="chat-input-wrapper">
                      <div className="chat-input-container">
                        <textarea className="chat-input" placeholder={modelStatus.loaded ? t('sendMessage') : t('load')} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={!modelStatus.loaded || isGenerating} rows={1} />
                        <div className="chat-input-actions">
<div className="chat-input-left">
                              <button className="input-icon-btn" onClick={attachFiles}><IconPlus size={18} /></button>
                              <div className="mcp-wrapper" ref={mcpRef}>
                              <button className="input-icon-btn" onClick={() => setShowMcpList(!showMcpList)}><IconHammer size={18} /></button>
                              {showMcpList && (<div className="mcp-dropdown">{mcpTools.map(tool => (<div key={tool.id} className="mcp-item" onClick={() => toggleMcp(tool.id)}><div className="mcp-item-info"><span className="mcp-item-name">{tool.name}</span><span className="mcp-item-desc">{tool.description}</span></div><div className={`mcp-toggle ${tool.enabled ? 'on' : ''}`}><div className="mcp-toggle-dot" /></div></div>))}</div>)}
                            </div>
                            <ModelDropdown selected={modelStatus.path} onSelect={handleLoadModel} disabled={isGenerating} />
                          </div>
                          <div className="chat-input-right">
                            <div className="context-circle-wrapper" ref={contextPopupRef}>
                              <div className="context-circle" onClick={() => setShowContextPopup(!showContextPopup)}>
                                <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="none" stroke="var(--border)" strokeWidth="2.5" /><circle cx="14" cy="14" r="12" fill="none" stroke={contextPct > 80 ? '#dc2626' : '#2563eb'} strokeWidth="2.5" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-90 14 14)" /></svg>
                                <span className="context-text">{contextPct}%</span>
                              </div>
                              {showContextPopup && (
                                <div className="context-popup">
                                  <div className="context-popup-title">{t('contextTitle')}</div>
                                  <div className="context-popup-row"><span>{t('used')}</span><span>{totalTokens.toLocaleString()} tokens</span></div>
                                  <div className="context-popup-row"><span>{t('available')}</span><span>{(settings.nCtx || 4096).toLocaleString()} tokens</span></div>
                                  <div className="context-popup-row"><span>{t('remaining')}</span><span>{Math.max(0, (settings.nCtx || 4096) - totalTokens).toLocaleString()} tokens</span></div>
                                  <div className="context-popup-bar"><div className="context-popup-bar-fill" style={{ width: `${contextPct}%`, background: contextPct > 80 ? '#dc2626' : '#2563eb' }} /></div>
                                </div>
                              )}
                            </div>
                            {isGenerating || imageGenLoading ? (<button className="send-btn-circle stop-btn" onClick={handleStop}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></button>) : (<button className="send-btn-circle" onClick={(showImageGen || installedImageGenModels.some(m => m.id === modelStatus.path)) ? handleImageGen : handleSend} disabled={!input.trim() || !modelStatus.loaded}><IconArrowRight size={18} /></button>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {activeView === 'server' && (
              <div className="server-view-new">
                <div className="server-topbar">
                  <div className="server-topbar-left">
                    <div className="server-status-pill"><span className={`status-dot ${serverRunning ? 'running' : ''}`}></span><span>Status: {serverRunning ? 'Running' : 'Stopped'}</span></div>
                    <div className="server-settings-wrapper" ref={mcpRef}>
                      <button className="server-pill-btn" onClick={() => setShowServerSettings(!showServerSettings)}><IconSettings size={14} /> Server Settings</button>
                      {showServerSettings && (
                        <div className="server-settings-dropdown">
                          <div className="ssd-row"><div className="ssd-label"><span>Server Port</span></div><input type="number" className="ssd-input" value={settings.port} onChange={e => setSettings({ ...settings, port: parseInt(e.target.value) || 1234 })} min={1} max={65535} /></div>
                          <div className="ssd-row"><div className="ssd-label"><span>Require Auth</span></div><label className="settings-toggle"><input type="checkbox" checked={settings.requireAuth !== false} onChange={e => setSettings({ ...settings, requireAuth: e.target.checked })} /><span className="settings-toggle-slider"></span></label></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="server-topbar-right">
                    <div className="server-reachable-box"><IconCode size={14} /><span className="server-url">http://localhost:{settings.port}/v1</span></div>
                    {serverRunning ? (<button className="server-load-btn" onClick={toggleServer} style={{ background: 'var(--accent-red)' }}><IconX size={14} /> Stop</button>) : (<button className="server-load-btn" onClick={toggleServer}><IconServer2 size={14} /> Start</button>)}
                  </div>
                </div>
                <div className="server-content">
                  <div className="server-left">
                    <div className="server-section">
                      <div className="server-section-header"><h3>{t('models')}</h3></div>
                      {modelStatus.loaded ? (
                        <div className="server-model-card">
                          <div className="server-model-info-row">
                            <span className="server-model-type">GGUF</span>
                            <span className="server-model-name-tag">{modelName(modelStatus.path)}</span>
                            <button className="server-eject-btn" onClick={handleUnload}>{t('eject')}</button>
                          </div>
                        </div>
                      ) : (<div className="server-empty-model"><p>{t('noModelLoaded')}</p><button className="server-load-btn-sm" onClick={() => setShowLoadModal(true)}><IconDownload size={14} /> {t('loadModel')}</button></div>)}
                    </div>
                    <div className="server-section">
                      <div className="server-section-header"><h3>Endpoints</h3></div>
                      <div className="server-endpoint-list">
                        <div className="server-endpoint-item"><span className="server-endpoint-method">POST</span><span className="server-endpoint-path">/v1/chat/completions</span></div>
                        <div className="server-endpoint-item"><span className="server-endpoint-method">GET</span><span className="server-endpoint-path">/v1/models</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="server-right">
                    <div className="server-triple-slider">
                      <div className="triple-slider-indicator" style={{ transform: `translateX(${serverInfoTab === 'info' ? '0%' : serverInfoTab === 'load' ? '100%' : '200%'})` }} />
                      <button className={`triple-slider-btn ${serverInfoTab === 'info' ? 'active' : ''}`} onClick={() => setServerInfoTab('info')}>Info</button>
                      <button className={`triple-slider-btn ${serverInfoTab === 'load' ? 'active' : ''}`} onClick={() => setServerInfoTab('load')}>Load</button>
                      <button className={`triple-slider-btn ${serverInfoTab === 'inference' ? 'active' : ''}`} onClick={() => setServerInfoTab('inference')}>Inference</button>
                    </div>
                    {serverInfoTab === 'info' && (
                      <div className="server-info-panel">
                        {modelStatus.loaded ? (
                          <div className="server-info-section">
                            <div className="server-info-table">
                              <div className="server-info-tr"><span className="server-info-td-label">Model</span><span className="server-info-td-value">{modelName(modelStatus.path)}</span></div>
                              <div className="server-info-tr"><span className="server-info-td-label">File</span><span className="server-info-td-value">{modelStatus.path.split('\\').pop()}</span></div>
                              <div className="server-info-tr"><span className="server-info-td-label">Format</span><span className="server-info-td-badge">GGUF</span></div>
                              <div className="server-info-tr"><span className="server-info-td-label">Size on disk</span><span className="server-info-td-value">{modelSizes[modelStatus.path] ? (modelSizes[modelStatus.path] / 1024).toFixed(2) + ' GB' : '?'}</span></div>
                            </div>
                          </div>
                        ) : <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('noModelLoaded')}</p>}
                      </div>
                    )}
                    {serverInfoTab === 'load' && (
                      <div className="server-load-panel">
                        {modelStatus.loaded ? (
                          <>
                            <div className="load-settings-section">
                              <div className="load-settings-header"><IconSettings size={16} /><h4>Context and Offload</h4></div>
                              <div className="load-settings-row"><span className="load-settings-label">{t('contextSize')}</span><input type="number" className="load-settings-input" value={settings.nCtx || 4096} onChange={e => setSettings({ ...settings, nCtx: parseInt(e.target.value) || 4096 })} min={512} max={131072} step={512} /></div>
                              <div className="load-slider-wrap"><input type="range" className="load-settings-slider" min={512} max={131072} step={512} value={settings.nCtx || 4096} onChange={e => setSettings({ ...settings, nCtx: parseInt(e.target.value) || 4096 })} /></div>
                              <div className="load-settings-row"><span className="load-settings-label">{t('gpuLayers')}</span><input type="number" className="load-settings-input" value={settings.gpuLayers || 0} onChange={e => setSettings({ ...settings, gpuLayers: parseInt(e.target.value) || 0 })} min={0} max={200} /></div>
                              <div className="load-slider-wrap"><input type="range" className="load-settings-slider" min={0} max={200} value={settings.gpuLayers || 0} onChange={e => setSettings({ ...settings, gpuLayers: parseInt(e.target.value) || 0 })} /></div>
                            </div>
                            <div className="load-settings-section">
                              <div className="load-settings-header"><IconCode size={16} /><h4>Advanced</h4></div>
                              <div className="load-settings-toggle-row"><span className="load-settings-label">Offload KV Cache to GPU</span><label className="settings-toggle"><input type="checkbox" checked={settings.gpuLayers > 0} onChange={e => setSettings({ ...settings, gpuLayers: e.target.checked ? 33 : 0 })} /><span className="settings-toggle-slider"></span></label></div>
                              <div className="load-settings-toggle-row"><span className="load-settings-label">Manter modelo em mem\u00f3ria</span><label className="settings-toggle"><input type="checkbox" checked={settings.keepModelInMemory !== false} onChange={e => setSettings({ ...settings, keepModelInMemory: e.target.checked })} /><span className="settings-toggle-slider"></span></label></div>
                              <div className="load-settings-toggle-row"><span className="load-settings-label">Tentar mmap()</span><label className="settings-toggle"><input type="checkbox" checked={settings.useMmap !== false} onChange={e => setSettings({ ...settings, useMmap: e.target.checked })} /><span className="settings-toggle-slider"></span></label></div>
                              <div className="load-settings-toggle-row"><span className="load-settings-label">Aten\u00e7\u00e3o Flash</span><label className="settings-toggle"><input type="checkbox" checked={settings.flashAttention || false} onChange={e => setSettings({ ...settings, flashAttention: e.target.checked })} /><span className="settings-toggle-slider"></span></label></div>
                            </div>
                          </>
                        ) : (<button className="server-load-btn" onClick={() => setShowLoadModal(true)} style={{ width: '100%' }}><IconDownload size={14} /> Select Model</button>)}
                      </div>
                    )}
                    {serverInfoTab === 'inference' && (
                      <div className="server-info-panel"><div className="server-info-section"><textarea className="server-system-prompt" value={settings.systemPrompt || ''} onChange={e => setSettings({ ...settings, systemPrompt: e.target.value })} placeholder={t('systemPrompt')} rows={10} /></div></div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeView === 'settings' && (
              <div className="settings-view-new">
                <div className="settings-header"><h2>{t('settings')}</h2><p className="settings-subtitle">{t('settings')}</p></div>
                <div className="settings-layout">
                  <div className="settings-sidebar">
                    <button className={`settings-nav-btn ${settingsView === 'geral' ? 'active' : ''}`} onClick={() => setSettingsView('geral')}><IconSettings size={16} /> {t('general')}</button>
                    <button className={`settings-nav-btn ${settingsView === 'aparencia' ? 'active' : ''}`} onClick={() => setSettingsView('aparencia')}><IconPalette size={16} /> {t('appearance')}</button>
                    <button className={`settings-nav-btn ${settingsView === 'chat' ? 'active' : ''}`} onClick={() => setSettingsView('chat')}><IconMessage size={16} /> {t('chat')}</button>
                    <button className={`settings-nav-btn ${settingsView === 'runtime' ? 'active' : ''}`} onClick={() => setSettingsView('runtime')}><IconServer2 size={16} /> {t('runtime')}</button>
                    <button className={`settings-nav-btn ${settingsView === 'hardware' ? 'active' : ''}`} onClick={() => setSettingsView('hardware')}><IconCpu size={16} /> {t('hardware')}</button>
                    <button className={`settings-nav-btn ${settingsView === 'idioma' ? 'active' : ''}`} onClick={() => setSettingsView('idioma')}><IconLanguage size={16} /> {t('language')}</button>
                    <button className={`settings-nav-btn ${settingsView === 'creditos' ? 'active' : ''}`} onClick={() => setSettingsView('creditos')}><IconHeart size={16} /> {t('creditsSupport')}</button>
                  </div>
                  <div className="settings-main">
                    <div className="settings-content">
                      {settingsView === 'geral' && (<><div className="settings-card"><div className="settings-card-header bg-primary"><IconSettings size={20} /><div><h3>Servidor</h3><p>Configuração da API</p></div></div><div className="settings-card-body"><div className="settings-row"><div className="settings-field-new"><label>Porta do Servidor</label><input type="number" value={settings.port} onChange={e => setSettings({ ...settings, port: parseInt(e.target.value) || 1234 })} /></div><div className="settings-field-new"><label>API Key</label><input type="password" value={settings.apiKey} onChange={e => setSettings({ ...settings, apiKey: e.target.value })} /></div></div></div></div><div className="settings-card"><div className="settings-card-header bg-primary"><IconSettings size={20} /><div><h3>Startup</h3><p>Comportamento ao iniciar</p></div></div><div className="settings-card-body"><div className="settings-row"><div className="settings-field-new"><label>Auto-load last model</label><div className="field-row"><span className="field-hint">Carregar automaticamente o último modelo</span><label className="settings-toggle"><input type="checkbox" checked={settings.autoLoadLast || false} onChange={e => setSettings({ ...settings, autoLoadLast: e.target.checked })} /><span className="settings-toggle-slider"></span></label></div></div></div></div></div><div className="settings-card"><div className="settings-card-header bg-primary"><IconDownload size={20} /><div><h3>Downloads</h3><p>Pasta de modelos</p></div></div><div className="settings-card-body"><div className="settings-row"><div className="settings-field-new" style={{ flex: 1 }}><label>Pasta de Destino</label><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><input type="text" value={settings.downloadFolder || ''} placeholder="Default (userData/models)" readOnly style={{ flex: 1 }} /><button className="settings-btn-secondary" onClick={async () => { const result = await (window as any).talos.selectFolder(); if (result.path) setSettings({ ...settings, downloadFolder: result.path }); }}>Escolher</button>{settings.downloadFolder && <button className="settings-btn-secondary" onClick={() => setSettings({ ...settings, downloadFolder: '' })}>Reset</button>}</div></div></div></div></div></>)}
                      {settingsView === 'aparencia' && (<div className="settings-card"><div className="settings-card-header bg-primary"><IconPalette size={20} /><div><h3>{t('appearance')}</h3><p>Apar\u00eancia</p></div></div><div className="settings-card-body"><div className="settings-row"><div className="settings-field-new"><label>Tema</label><select className="settings-select" value={settings.theme || 'light'} onChange={e => setSettings({ ...settings, theme: e.target.value, themeExplicit: true })}><option value="dark">Escuro</option><option value="light">Claro</option></select></div></div></div></div>)}
                      {settingsView === 'chat' && (<div className="settings-card"><div className="settings-card-header bg-primary"><IconMessage size={20} /><div><h3>{t('chat')}</h3><p>Chat</p></div></div><div className="settings-card-body"><div className="settings-row"><div className="settings-field-new"><label>{t('maxTokens')}</label><input type="number" value={settings.maxTokens || 2048} onChange={e => setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 2048 })} /></div><div className="settings-field-new"><label>{t('temperature')}</label><input type="number" value={settings.temperature || 0.7} onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) || 0.7 })} min={0} max={2} step={0.1} /></div></div></div></div>)}
                      {settingsView === 'runtime' && (<>
                        <div className="settings-card">
                          <div className="settings-card-header bg-primary"><IconBolt size={20} /><div><h3>{t('runtime')}</h3><p>{t('runtimeDesc')}</p></div></div>
                          <div className="settings-card-body">
                            <div style={{ marginBottom: '0' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>{t('runtimeSelections')}</h4>
                              <div className="settings-row" style={{ alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', minWidth: '60px' }}>GGUF</span>
                                <CustomSelect style={{ flex: 1 }} value={runtimeEngine} onChange={v => { setRuntimeEngine(v); setSettings({ ...settings, runtimeEngine: v }); }} options={[
                                  ...enginesList.filter(e => e.compatible).map(e => ({ value: e.id, label: `${e.name} (Windows) v${e.version}` })),
                                  ...enginesList.filter(e => !e.compatible).map(e => ({ value: e.id, label: `${e.name} (Windows) - ${t('nonCompatible')}`, disabled: true })),
                                ]} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="settings-card">
                          <div className="settings-card-header bg-primary"><IconBolt size={20} /><div><h3>Talos Engine</h3><p>Motor de inferencia nativo Go + llama.cpp</p></div></div>
                          <div className="settings-card-body">
                            <div className="settings-row" style={{ alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', minWidth: '140px' }}>Inference Backend</span>
                              <CustomSelect style={{ flex: 1 }} value={settings.talosEngineBackend || 'node-llama'} onChange={v => setSettings({ ...settings, talosEngineBackend: v })} options={[
                                { value: 'node-llama', label: 'Ollama' },
                                { value: 'talos-engine', label: 'Talos Engine' },
                                { value: 'talos-cli', label: 'Talos CLI' },
                              ]} />
                            </div>
                          </div>
                        </div>
                        <div className="settings-card">
                          <div className="settings-card-header bg-primary"><IconCode size={20} /><div><h3>{t('enginesFrameworks')}</h3><p>{t('enginesFrameworksDesc')}</p></div></div>
                          <div className="settings-card-body">
                            <div className="settings-row" style={{ gap: '8px', marginBottom: '12px' }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                <IconSearch size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input type="text" className="settings-input" style={{ paddingLeft: '32px', width: '100%' }} placeholder={t('searchEllipsis')} value={runtimeSearch} onChange={e => setRuntimeSearch(e.target.value)} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <CustomSelect style={{ width: '140px' }} value={runtimeFilter} onChange={setRuntimeFilter} options={[
                                  { value: 'compatible', label: t('compatibleOnly') },
                                  { value: 'all', label: t('allTypes') },
                                ]} />
                                <CustomSelect style={{ width: '120px' }} value={runtimeTypeFilter} onChange={setRuntimeTypeFilter} options={[
                                  { value: 'all', label: t('allTypes') },
                                  { value: 'cpu', label: t('cpu') },
                                  { value: 'gpu', label: 'GPU' },
                                ]} />
                              </div>
                            </div>
                            {enginesList
                              .filter(e => {
                                if (runtimeSearch && !e.name.toLowerCase().includes(runtimeSearch.toLowerCase()) && !e.description.toLowerCase().includes(runtimeSearch.toLowerCase())) return false;
                                if (runtimeFilter === 'compatible' && !e.compatible) return false;
                                if (runtimeTypeFilter === 'cpu' && e.id !== 'cpu' && e.id !== 'talos-engine' && e.id !== 'airllm') return false;
                                if (runtimeTypeFilter === 'gpu' && (e.id === 'cpu' || e.id === 'talos-engine' || e.id === 'airllm')) return false;
                                return true;
                              })
                              .map(engine => {
                                const hasUpdate = engine.latestVersion && engine.version !== engine.latestVersion;
                                const isInstalled = engine.installed;
                                const isAirllm = engine.id === 'airllm';
                                return (
                                <div key={engine.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                      {engine.icon === 'cpu' ? <IconCpu size={16} style={{ color: 'var(--text-muted)' }} /> : <IconBolt size={16} style={{ color: 'var(--text-muted)' }} />}
                                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{engine.name}</span>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>v{engine.version}</span>
                                      {isInstalled && <span style={{ fontSize: '10px', color: '#000', background: 'rgba(0,0,0,0.08)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Instalado</span>}
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{engine.description}</p>
                                    {isAirllm && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{!airllmStatus?.pythonFound ? t('airllmPythonMissing') : !airllmStatus?.airllmInstalled ? t('airllmInstalling') : `${t('airllmActive')} (v${airllmStatus?.airllmVersion || '?'})`}</span>}
                                    {engine.size && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{engine.size}</span>}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isAirllm ? (
                                      <span style={{ fontSize: '12px', color: '#000', display: 'flex', alignItems: 'center', gap: '4px' }}><IconCheck size={14} /> {airllmStatus?.airllmInstalled ? t('airllmActive') : t('airllmInstalling')}</span>
                                    ) : !engine.compatible ? (
                                      <span style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><IconAlertTriangle size={14} /> {t('nonCompatible')}</span>
                                    ) : engineUpdates[engine.id]?.hasUpdate ? (
                                      <button className="settings-btn-primary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => {
                                        alert(`Atualização disponível para ${engine.name}: ${engineUpdates[engine.id]?.current} → ${engineUpdates[engine.id]?.latest}`);
                                      }}>Atualizar v{engineUpdates[engine.id]?.latest}</button>
                                    ) : (
                                      <span style={{ fontSize: '12px', color: '#000', display: 'flex', alignItems: 'center', gap: '4px' }}><IconCheck size={14} /> {t('latestVersion')}</span>
                                    )}
                                  </div>
                                </div>
                                );
                              })}
                            {enginesList.filter(e => {
                              if (runtimeSearch && !e.name.toLowerCase().includes(runtimeSearch.toLowerCase())) return false;
                              if (runtimeFilter === 'compatible' && !e.compatible) return false;
                              if (runtimeTypeFilter === 'cpu' && e.id !== 'cpu' && e.id !== 'talos-engine' && e.id !== 'airllm') return false;
                              if (runtimeTypeFilter === 'gpu' && (e.id === 'cpu' || e.id === 'talos-engine' || e.id === 'airllm')) return false;
                              return true;
                            }).length === 0 && (
                              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                {t('noEnginesFound')}
                              </div>
                            )}
                          </div>
                        </div>
                      </>)}
                      {settingsView === 'hardware' && (
                        <div className="settings-content">
                          {hardwareInfo ? (
                            <div className="settings-content">
                              <div className="settings-hw-row">
                                <div className="settings-card"><div className="settings-card-body" style={{ padding: '16px 20px' }}><div className="settings-hw-header"><IconCpu size={16} /><h4>{t('cpu')}</h4><span className="hw-compatible">{'\u2713'} {t('compatible')}</span></div><div className="hw-info-row"><span className="hw-label">{t('name')}</span><span className="hw-value">{hardwareInfo.cpu?.name || 'Unknown'}</span></div><div className="hw-info-row"><span className="hw-label">{t('architecture')}</span><div className="hw-badges"><span className="hw-badge">{hardwareInfo.cpu?.architecture || 'N/A'}</span>{hardwareInfo.cpu?.avx && <span className="hw-badge">AVX</span>}{hardwareInfo.cpu?.avx2 && <span className="hw-badge">AVX2</span>}</div></div></div></div>
                                <div className="settings-card"><div className="settings-card-body" style={{ padding: '16px 20px' }}><div className="settings-hw-header"><IconBrain size={16} /><h4>{t('memoryCapacity')}</h4></div><div className="hw-info-row"><span className="hw-label">{t('ram')}</span><span className="hw-value">{hardwareInfo.memory?.totalFormatted || 'N/A'}</span></div><div className="hw-info-row"><span className="hw-label">{t('vram')}</span><span className="hw-value">{hardwareInfo.gpu?.vramFormatted || 'N/A'}</span></div></div></div>
                              </div>
                              <div className="settings-card"><div className="settings-card-body" style={{ padding: '16px 20px' }}><div className="settings-hw-header"><IconCpu size={16} /><h4>{t('gpus')}</h4></div>{hardwareInfo.gpu?.detected ? (<div className="hw-gpu-card" style={{ marginTop: '8px' }}><div className="hw-gpu-info"><span className="hw-gpu-name">{hardwareInfo.gpu.name}</span><span className="hw-gpu-detail">VRAM: {hardwareInfo.gpu.vramFormatted}</span></div><div className="hw-toggle-group"><label className="settings-toggle"><input type="checkbox" checked={settings.gpuLayers > 0} onChange={e => setSettings({ ...settings, gpuLayers: e.target.checked ? 33 : 0 })} /><span className="settings-toggle-slider"></span></label></div></div>) : (<p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>{t('noGpuDetected')}</p>)}<div className="hw-kv-row" style={{ padding: '12px 0' }}><span className="hw-kv-label">{t('offloadKVCache')}</span><label className="settings-toggle"><input type="checkbox" checked={settings.gpuLayers > 0} onChange={e => setSettings({ ...settings, gpuLayers: e.target.checked ? 33 : 0 })} /><span className="settings-toggle-slider"></span></label></div></div></div>
                              <div className="settings-card"><div className="settings-card-body" style={{ padding: '16px 20px' }}><div className="settings-hw-header"><IconBrain size={16} /><h4>{t('resourceMonitor')}</h4></div><div className="hw-resource-row"><div className="hw-resource-item"><span className="hw-resource-label">RAM + VRAM</span><span className="hw-resource-value">{hardwareInfo.memory?.usedFormatted || '0 GB'}</span></div><div className="hw-resource-item"><span className="hw-resource-label">{t('cpu')}</span><span className="hw-resource-value">0.00%</span></div></div></div></div>
                              <div className="settings-card"><div className="settings-card-body" style={{ padding: '16px 20px' }}><div className="settings-hw-header"><IconSettings size={16} /><h4>{t('guardrails')}</h4></div><p className="hw-guardrails-title">{t('guardrailsDesc')}</p><div className="hw-radio-list">{[{ id: 'off', label: t('guardOff'), desc: t('guardOffDesc') }, { id: 'relaxed', label: t('guardRelaxed'), desc: t('guardRelaxedDesc') }, { id: 'balanced', label: t('guardBalanced'), desc: t('guardBalancedDesc') }, { id: 'conservative', label: t('guardConservative'), desc: t('guardConservativeDesc') }].map((g: any) => (<label key={g.id} className="hw-radio-item"><input type="radio" name="guardrails" checked={(settings.guardrails || 'balanced') === g.id} onChange={() => setSettings({ ...settings, guardrails: g.id })} /><div className="hw-radio-content"><span className="hw-radio-label">{g.label}</span><span className="hw-radio-desc">{g.desc}</span></div></label>))}</div></div></div>
                              <div className="settings-card"><div className="settings-card-body" style={{ padding: '16px 20px' }}><div className="settings-hw-header"><IconBolt size={16} /><h4>{t('airllm')}</h4><label className="settings-toggle" style={{ marginLeft: 'auto' }}><input type="checkbox" checked={settings.airllmEnabled || false} onChange={async (e) => { setSettings({ ...settings, airllmEnabled: e.target.checked }); if (e.target.checked) { setAirllmStarting(true); await (window as any).talos.startAirllmServer(); setAirllmStarting(false); } else { await (window as any).talos.stopAirllmServer(); } }} /><span className="settings-toggle-slider"></span></label></div><div style={{ marginTop: '8px' }}><div className="hw-info-row"><span className="hw-label">{t('airllmStatus')}</span><span className="hw-value">{!airllmStatus?.pythonFound ? t('airllmPythonMissing') : !airllmStatus?.airllmInstalled ? t('airllmInstalling') : `${t('airllmActive')} (v${airllmStatus?.airllmVersion || '?'})`}</span></div></div></div></div>
                            </div>
                          ) : (<div className="settings-card"><div className="settings-card-body"><div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}><IconRefresh size={16} className="spin" /><span>{t('loading')}</span></div></div></div>)}
                        </div>
                      )}
                      {settingsView === 'idioma' && (
                        <div className="settings-card">
                          <div className="settings-card-header bg-primary"><IconLanguage size={20} /><div><h3>{t('language')}</h3><p>{t('languageDesc')}</p></div></div>
                          <div className="settings-card-body">
                            <div className="settings-row">
                              <div className="settings-field-new">
                                <label>{t('interfaceLanguage')}</label>
                                <div className="lang-dropdown" ref={langDropdownRef}>
                                  <button className="lang-dropdown-btn" ref={langBtnRef} onClick={() => { if (langBtnRef.current) { const r = langBtnRef.current.getBoundingClientRect(); setLangDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width }); } setShowLangDropdown(!showLangDropdown); }}>
                                    <IconLanguage size={14} />
                                    <span>{LANGUAGES.find(l => l.value === (settings.language || 'en'))?.label || 'Portugu\u00eas (Brasil)'}</span>
                                    <IconChevronDown size={14} />
                                  </button>
                                  {showLangDropdown && (
                                    <div className="lang-dropdown-menu" style={{ top: langDropdownPos.top, left: langDropdownPos.left, width: langDropdownPos.width }}>
                                      {LANGUAGES.map(l => (
                                        <div key={l.value} className={`lang-dropdown-item ${(settings.language || 'en') === l.value ? 'active' : ''}`} onClick={() => { setSettings({ ...settings, language: l.value }); setShowLangDropdown(false); }}>
                                          <span>{l.label}</span>
                                          {(settings.language || 'en') === l.value && <IconCheck size={14} />}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="field-hint-new">{t('language') ? 'Aplicado ao reiniciar' : 'Aplicado ao reiniciar'}</span>
                              </div>
                            </div>
                            <div className="settings-toggle-row" style={{ marginTop: '16px' }}>
                              <span>{t('autoDetect')}</span>
                              <label className="settings-toggle"><input type="checkbox" checked={settings.autoDetectLanguage !== false} onChange={e => setSettings({ ...settings, autoDetectLanguage: e.target.checked })} /><span className="settings-toggle-slider"></span></label>
                            </div>
                          </div>
                        </div>
                      )}
                      {settingsView === 'creditos' && (
                        <div className="settings-card">
                          <div className="settings-card-header bg-primary"><IconHeart size={20} /><div><h3>{t('creditsSupport')}</h3><p>{t('creditsSupportDesc')}</p></div></div>
                          <div className="settings-card-body">
                            <div className="settings-row">
                              <div className="settings-field-new">
                                <label>{t('about')}</label>
                                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '4px 0 12px' }}>{t('aboutDesc')}</p>
                              </div>
                            </div>
                            <div className="settings-row">
                              <div className="settings-field-new">
                                <label>{t('support')}</label>
                                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{t('supportDesc')}</p>
                                <a href="https://github.com/anomalyco/opencode/issues" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', width: 'fit-content' }}>{t('reportIssue')} <IconArrowUpRight size={14} /></a>
                              </div>
                            </div>
                            <div className="settings-row">
                              <div className="settings-field-new">
                                <label>{t('donate')}</label>
                                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{t('donateDesc')}</p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button onClick={handleDonate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', width: 'fit-content', border: 'none', cursor: 'pointer' }}>Ghost Pay / Donat <IconArrowUpRight size={14} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeView === 'models' && (
              <div className="models-table-view">
                <div className="models-table-header"><h2>{t('installedModels')}</h2><button className="refresh-btn" onClick={refreshModels}><IconRefresh size={16} /> {t('update')}</button></div>
                {models.length === 0 ? (<div className="hf-empty"><IconDownload size={48} /><span>{t('noModelsFound')}</span></div>) : (
                  <div className="models-table-container">
                    <table className="models-table">
                      <thead><tr><th></th><th>Nome</th><th>Tamanho</th><th>Status</th><th>A\u00e7\u00f5es</th></tr></thead>
                      <tbody>
                        {models.map(m => (
                          <tr key={m} className={modelStatus.path === m ? 'models-table-active' : ''}>
                            <td><img src={avatarForModel(m)} alt="" className="models-table-avatar" /></td>
                            <td className="models-table-name">{modelName(m)}</td>
                            <td className="models-table-size">{modelSizes[m] || '?'} MB</td>
                            <td className="models-table-status">{modelStatus.path === m ? <span className="models-status-badge active">Ativo</span> : <span className="models-status-badge">{t('inactive')}</span>}</td>
                            <td className="models-table-actions" style={{ display: 'flex', gap: '6px' }}>{modelStatus.path === m ? (<button className="btn-unload" onClick={handleUnload}><IconX size={14} /> {t('eject')}</button>) : (<button className="btn-load" onClick={() => handleLoadModel(m)} disabled={isGenerating}><IconDownload size={14} /> {t('load')}</button>)}<button className="btn-unload" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }} onClick={async () => { if (confirm(t('deleteModelConfirm') + ' ' + modelName(m) + '?')) { const r = await (window as any).talos.deleteModel(m); if (r.success) { refreshModels(); } else { alert(r.error); } } }}><IconTrash size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </main>
          {showLoadModal && (<div className="modal-overlay" onClick={() => setShowLoadModal(false)}><div className="load-modal" onClick={e => e.stopPropagation()}><div className="load-modal-header"><h2>{t('loadModel')}</h2><button className="hf-modal-close-btn" onClick={() => setShowLoadModal(false)}><IconX size={18} /></button></div><div className="load-modal-body">{models.length === 0 ? (<div className="hf-empty"><IconSearch size={48} /><span>{t('noModelsFound')}</span></div>) : (<div className="load-model-list">{models.map(m => (<div key={m} className={`load-model-item ${modelStatus.path === m ? 'active' : ''}`}><div className="load-model-info"><img src={avatarForModel(m)} alt="" className="load-model-logo" /><div><span className="load-model-name">{modelName(m)}</span><span className="load-model-size">{modelSizes[m] || '?'} MB</span></div></div><div className="load-model-actions">{modelStatus.path === m ? (<button className="load-model-eject" onClick={handleUnload}><IconX size={14} /> {t('eject')}</button>) : (<button className="load-model-btn" onClick={() => { handleLoadModel(m); setShowLoadModal(false); }} disabled={isGenerating}>{t('load')}</button>)}</div></div>))}</div>)}</div></div></div>)}
          {showHfModal && (<div className="modal-overlay" onClick={() => { setShowHfModal(false); setHfSelectedModel(null); }}><div className="hf-modal" onClick={e => e.stopPropagation()}><button className="hf-modal-close-btn" onClick={() => { setShowHfModal(false); setHfSelectedModel(null); }}><IconX size={18} /></button><div className="hf-modal-body"><div className="hf-panel-left"><div className="hf-search-bar"><input type="text" placeholder={t('searchModels')} value={hfSearchQuery} onChange={e => setHfSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') hfSearch(hfSearchQuery); }} />{hfSearchQuery && <button className="hf-search-clear" onClick={() => { setHfSearchQuery(''); setHfModels(VERIFIED_MODELS); }}><IconX size={14} /></button>}</div>{hfSearching ? (<div className="hf-loading"><IconRefresh size={24} className="spin" /><span>{t('searching')}</span></div>) : (<div className="hf-model-list">{hfModels.map(m => (<div key={m.id} className={'hf-model-item ' + (hfSelectedModel?.id === m.id ? 'selected' : '')} onClick={() => hfSelectModel(m)}><div className="hf-model-item-header"><img src={avatarForModel(m.id)} alt="" className="hf-model-logo" style={{objectFit:'contain',background:'#fff'}} /><div className="hf-model-info"><div className="hf-model-title-row"><span className="hf-model-name">{m.name}</span>{m.tags && m.tags.includes('reasoning') && <IconBrain size={14} style={{color:'var(--text-primary)'}} />}{m.tags && m.tags.includes('tool-use') && <IconHammer size={14} style={{color:'var(--text-primary)'}} />}{m.tags && m.tags.includes('vision') && <IconEye size={16} style={{color:'var(--text-primary)',flexShrink:0,marginLeft:'auto',alignSelf:'center'}} />}{m.verified && <span className="hf-model-verified"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/></svg></span>}</div><div className="hf-model-desc-row"><span className="hf-model-desc">{m.description}</span></div></div></div></div>))}</div>)}</div><div className="hf-panel-right">{hfSelectedModel ? (<div className="hf-detail"><div className="hf-detail-header"><h2>{hfSelectedModel.name}</h2></div><div className="hf-model-info-grid"><div className="hf-info-item"><span className="hf-info-label">Author:</span><span className="hf-info-value">{hfSelectedModel.originalAuthor || hfSelectedModel.author}</span></div><div className="hf-info-item"><span className="hf-info-label">Downloads:</span><span className="hf-info-value">{hfSelectedModel.downloads?.toLocaleString()}</span></div></div><div className="hf-detail-desc">{hfSelectedModel.description}</div><div className="hf-detail-section"><h3><IconDownload size={16} /> GGUF Files</h3>{hfLoadingDetail ? (<div className="hf-loading"><IconRefresh size={20} className="spin" /></div>) : hfModelFiles.length === 0 ? (<p className="hf-empty-text">{t('noGguf')}</p>) : (<div className="hf-download-list">{hfModelFiles.map(f => (<div key={f.path} className="hf-download-item"><div className="hf-download-info"><span className="hf-download-fmt">GGUF</span><div><div className="hf-download-name">{f.path.split('/').pop()}</div><div className="hf-download-size">{formatSize(f.size)}</div></div></div><button className="hf-download-btn" onClick={() => hfDownloadFile(f, hfSelectedModel.modelId)}><IconDownload size={14} /> Download</button></div>))}</div>)}</div></div>) : <div className="hf-empty"><IconSearch size={48} /><span>{t('selectModel')}</span></div>}</div></div></div></div>)}
          {downloadProgress && !downloadProgress.done && !hideMainCard && (<div className="modal-overlay"><div className="download-progress-card" onClick={e => e.stopPropagation()}><button className="download-close-btn" onClick={dismissDownload}><IconX size={18} /></button><div className="download-progress-circle"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" /><circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="8" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - (downloadProgress.percent || 0) / 100)} strokeLinecap="round" transform="rotate(-90 60 60)" /></svg><span className="download-progress-percent">{downloadProgress.percent || 0}%</span></div><div className="download-progress-info"><span className="download-progress-filename">{downloadProgress.filename}</span><span className="download-progress-size">{formatSize(downloadProgress.downloaded || 0)} / {formatSize(downloadProgress.total || 0)}</span></div><button className="download-cancel-btn" onClick={cancelDownload}>{t('cancel')}</button></div></div>)}
          {modelLoading && (<div className="modal-overlay"><div className="download-progress-card" onClick={e => e.stopPropagation()}><div className="download-progress-circle"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" /><circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="8" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - modelLoadProgress / 100)} strokeLinecap="round" transform="rotate(-90 60 60)" /></svg><span className="download-progress-percent">{Math.round(modelLoadProgress)}%</span></div><div className="download-progress-info"><span className="download-progress-filename">{imageGenServerStatus?.message || t('loadingModel')}</span>{modelLoadError && <span className="download-progress-error">{modelLoadError}</span>}</div></div></div>)}
        </div>
      )}
    </>
  );
}

export default App;
