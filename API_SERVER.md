# Talos LLM Studio — API Server Documentation

O Talos LLM Studio inclui um servidor HTTP local que expõe uma API compatível com o formato **OpenAI API**, permitindo que qualquer aplicação se conecte a modelos LLM rodando diretamente no dispositivo Android, sem nuvem.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Início Rápido](#início-rápido)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Listar Modelos](#listar-modelos)
  - [Chat Completions](#chat-completions)
  - [Text Completions](#text-completions)
- [Exemplos de Requisição](#exemplos-de-requisição)
  - [cURL](#curl)
  - [JavaScript / Node.js](#javascript--nodejs)
  - [Python](#python)
  - [React Native (dentro do app)](#react-native-dentro-do-app)
- [Formato das Respostas](#formato-das-respostas)
- [Parâmetros Disponíveis](#parâmetros-disponíveis)
- [Erros Comuns](#erros-comuns)
- [Arquitetura](#arquitetura)

---

## Visão Geral

| Característica        | Detalhe                                          |
|-----------------------|--------------------------------------------------|
| **Protocolo**         | HTTP                                             |
| **Formato**           | JSON (`application/json`)                        |
| **Autenticação**      | Bearer Token (API Key)                           |
| **Compatibilidade**   | OpenAI API (`/v1/chat/completions`, `/v1/models`) |
| **Modelos suportados**| Qualquer modelo `.gguf` (via `llama.rn`)         |
| **Onde roda**         | Localmente no dispositivo Android                |
| **Dependências externas**| Nenhuma — tudo roda offline após carregar o modelo |

---

## Início Rápido

1. Abra o Talos LLM Studio no Android
2. Vá para a aba **Server**
3. Toque no switch para ligar o servidor
4. O IP e a porta serão exibidos na tela
5. Use o IP, porta e API Key para conectar sua aplicação

```
Endereço padrão: http://<IP_DO_CELULAR>:1234
```

A API Key padrão é: `lm-studio-v1-key-secret` (pode ser alterada na tela do servidor)

---

## Autenticação

Os endpoints `/health` e `/v1/models` **não** exigem autenticação.

Todos os outros endpoints exigem o header:

```
Authorization: Bearer <SUA_API_KEY>
```

Se a chave estiver incorreta ou ausente, a API retorna:

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error"
  }
}
```

**Status:** `401 Unauthorized`

---

## Endpoints

### Health Check

Verifica se o servidor está rodando e quais modelos estão ativos.

```
GET /health
GET /
```

**Não requer autenticação.**

**Resposta (200):**

```json
{
  "status": "ok",
  "models": ["gemma-2-2b-it-q4_k_m.gguf"],
  "data": [
    {
      "id": "gemma-2-2b-it-q4_k_m.gguf",
      "object": "model",
      "created": 1718000000,
      "owned_by": "local",
      "ready": true
    }
  ],
  "uptime": 12345
}
```

| Campo     | Tipo       | Descrição                          |
|-----------|------------|------------------------------------|
| `status`  | `string`   | Status do servidor (`"ok"`)        |
| `models`  | `string[]` | Nomes dos modelos com status ativo |
| `data`    | `Array`    | Lista detalhada dos modelos ativos |
| `uptime`  | `number`   | Timestamp do servidor (epoch)      |

---

### Listar Modelos

Retorna todos os modelos carregados no servidor (ativos e inativos).

```
GET /v1/models
GET /models
```

**Não requer autenticação.**

**Resposta (200):**

```json
{
  "object": "list",
  "data": [
    {
      "id": "gemma-2-2b-it-q4_k_m.gguf",
      "object": "model",
      "created": 1718000000,
      "owned_by": "local",
      "ready": true
    }
  ]
}
```

| Campo       | Tipo      | Descrição                                      |
|-------------|-----------|------------------------------------------------|
| `id`        | `string`  | Nome do arquivo do modelo                      |
| `object`    | `string`  | Sempre `"model"`                               |
| `created`   | `number`  | Timestamp de criação (epoch)                   |
| `owned_by`  | `string`  | Sempre `"local"`                               |
| `ready`     | `boolean` | `true` se o modelo está carregado e ativo      |

---

### Chat Completions

Gera uma resposta de chat baseada em uma lista de mensagens.

```
POST /v1/chat/completions
POST /chat/completions
```

**Requer autenticação.**

**Request Body:**

```json
{
  "model": "gemma-2-2b-it-q4_k_m.gguf",
  "messages": [
    { "role": "system", "content": "Você é um assistente útil." },
    { "role": "user", "content": "Olá, como você está?" }
  ],
  "max_tokens": 512,
  "temperature": 0.7,
  "top_p": 0.95,
  "stop": ["\n\n"]
}
```

| Campo         | Tipo                  | Obrigatório | Padrão | Descrição                           |
|---------------|-----------------------|-------------|--------|-------------------------------------|
| `model`       | `string`              | Não         | —      | Nome do modelo (usa o ativo se omitido) |
| `messages`    | `Array<Message>`      | Sim         | —      | Lista de mensagens da conversa      |
| `max_tokens`  | `number`              | Não         | `512`  | Número máximo de tokens a gerar     |
| `temperature` | `number`              | Não         | `0.7`  | Aleatoriedade (0.0–2.0)             |
| `top_p`       | `number`              | Não         | `0.95` | Sampling por probabilidade acumulada|
| `stop`        | `string[]` ou `string`| Não         | `[]`   | Sequências que interrompem a geração|

**Formato de `Message`:**

```json
{
  "role": "system" | "user" | "assistant",
  "content": "texto da mensagem"
}
```

**Resposta (200):**

```json
{
  "id": "chatcmpl-1718000000000",
  "object": "chat.completion",
  "created": 1718000000,
  "model": "gemma-2-2b-it-q4_k_m.gguf",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Olá! Estou bem, obrigado por perguntar."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 18,
    "total_tokens": 43
  }
}
```

> **Nota:** O servidor usa apenas a **última mensagem** da lista como prompt para o modelo. Não há suporte a janela de contexto automática — cada requisição é uma inferência isolada.

---

### Text Completions

Gera uma conclusão de texto a partir de um prompt simples.

```
POST /v1/completions
POST /completions
```

**Requer autenticação.**

**Request Body:**

```json
{
  "model": "gemma-2-2b-it-q4_k_m.gguf",
  "prompt": "A capital da França é",
  "max_tokens": 100,
  "temperature": 0.5,
  "top_p": 0.9,
  "stop": ["."]
}
```

| Campo         | Tipo                  | Obrigatório | Padrão | Descrição                           |
|---------------|-----------------------|-------------|--------|-------------------------------------|
| `model`       | `string`              | Não         | —      | Nome do modelo (usa o ativo se omitido) |
| `prompt`      | `string`              | Sim         | —      | Texto de entrada                     |
| `max_tokens`  | `number`              | Não         | `512`  | Número máximo de tokens a gerar     |
| `temperature` | `number`              | Não         | `0.7`  | Aleatoriedade (0.0–2.0)             |
| `top_p`       | `number`              | Não         | `0.95` | Sampling por probabilidade acumulada|
| `stop`        | `string[]`            | Não         | `[]`   | Sequências que interrompem a geração|

**Resposta (200):**

```json
{
  "id": "cmpl-1718000000000",
  "object": "text_completion",
  "created": 1718000000,
  "model": "gemma-2-2b-it-q4_k_m.gguf",
  "choices": [
    {
      "text": "Paris.",
      "index": 0,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 6,
    "completion_tokens": 2,
    "total_tokens": 8
  }
}
```

---

## Exemplos de Requisição

### cURL

**Health check:**
```bash
curl http://192.168.1.100:1234/health
```

**Listar modelos:**
```bash
curl http://192.168.1.100:1234/v1/models
```

**Chat completion:**
```bash
curl -X POST http://192.168.1.100:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio-v1-key-secret" \
  -d '{
    "model": "gemma-2-2b-it-q4_k_m.gguf",
    "messages": [
      { "role": "user", "content": "Explique o que é uma API em 3 frases." }
    ],
    "max_tokens": 200,
    "temperature": 0.7
  }'
```

**Text completion:**
```bash
curl -X POST http://192.168.1.100:1234/v1/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio-v1-key-secret" \
  -d '{
    "model": "gemma-2-2b-it-q4_k_m.gguf",
    "prompt": "def fibonacci(n):",
    "max_tokens": 300,
    "temperature": 0.2
  }'
```

---

### JavaScript / Node.js

```javascript
const API_URL = "http://192.168.1.100:1234";
const API_KEY = "lm-studio-v1-key-secret";

async function chat(userMessage) {
  const response = await fetch(`${API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gemma-2-2b-it-q4_k_m.gguf",
      messages: [{ role: "user", content: userMessage }],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Uso
const resposta = await chat("O que é React Native?");
console.log(resposta);
```

**Com Axios:**

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.1.100:1234",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer lm-studio-v1-key-secret",
  },
});

const { data } = await api.post("/v1/chat/completions", {
  model: "gemma-2-2b-it-q4_k_m.gguf",
  messages: [{ role: "user", content: "Olá!" }],
  max_tokens: 256,
});

console.log(data.choices[0].message.content);
```

---

### Python

```python
import requests

API_URL = "http://192.168.1.100:1234"
API_KEY = "lm-studio-v1-key-secret"

def chat(user_message):
    response = requests.post(
        f"{API_URL}/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        json={
            "model": "gemma-2-2b-it-q4_k_m.gguf",
            "messages": [{"role": "user", "content": user_message}],
            "max_tokens": 512,
            "temperature": 0.7,
        },
    )
    data = response.json()
    return data["choices"][0]["message"]["content"]

# Uso
resposta = chat("Explique o que é uma API REST")
print(resposta)
```

**Com OpenAI SDK (substituindo a URL):**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://192.168.1.100:1234/v1",
    api_key="lm-studio-v1-key-secret",
)

response = client.chat.completions.create(
    model="gemma-2-2b-it-q4_k_m.gguf",
    messages=[{"role": "user", "content": "Olá!"}],
    max_tokens=256,
)

print(response.choices[0].message.content)
```

---

### React Native (dentro do app)

```javascript
import React, { useState } from "react";
import { View, Text, TextInput, Button, FlatList } from "react-native";

const API_URL = "http://0.0.0.0:1234"; // localhost no emulador
const API_KEY = "lm-studio-v1-key-secret";

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const response = await fetch(`${API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemma-2-2b-it-q4_k_m.gguf",
        messages: [...messages, userMsg],
        max_tokens: 512,
      }),
    });

    const data = await response.json();
    const assistantMsg = data.choices[0].message;
    setMessages((prev) => [...prev, assistantMsg]);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <Text style={{ marginVertical: 4 }}>
            {item.role === "user" ? "Você" : "IA"}: {item.content}
          </Text>
        )}
      />
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Digite sua mensagem..."
        style={{ borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 8 }}
      />
      <Button title="Enviar" onPress={sendMessage} />
    </View>
  );
}
```

> **Dica:** Ao rodar em um dispositivo físico, use o IP local da rede (ex: `192.168.1.100`) em vez de `0.0.0.0`.

---

## Formato das Respostas

Todas as respostas são JSON. Códigos de status HTTP:

| Código | Significado                                   |
|--------|-----------------------------------------------|
| `200`  | Sucesso                                       |
| `401`  | Chave de API inválida ou ausente              |
| `404`  | Endpoint não encontrado                       |
| `500`  | Erro interno (modelo não carregado, erro de inferência, etc.) |

**Formato de erro:**

```json
{
  "error": {
    "message": "Model 'xyz' is not active."
  }
}
```

---

## Parâmetros Disponíveis

| Parâmetro      | Tipo     | Valores            | Descrição                                          |
|----------------|----------|--------------------|----------------------------------------------------|
| `temperature`  | `number` | `0.0` – `2.0`     | Controla a aleatoriedade. `0` = determinístico.     |
| `top_p`        | `number` | `0.0` – `1.0`     | Nucleus sampling. Reduz tokens de baixa probabilidade. |
| `max_tokens`   | `number` | `1` – `32768`     | Limite de tokens na resposta.                      |
| `stop`         | `array`  | Strings            | Sequências de texto que interrompem a geração.     |

---

## Erros Comuns

| Erro                                    | Causa                                              | Solução                                    |
|-----------------------------------------|----------------------------------------------------|--------------------------------------------|
| `Connection refused`                    | Servidor desligado ou IP incorreto                 | Verifique o IP e porta no app              |
| `Invalid API key`                      | Header `Authorization` incorreto                   | Use `Bearer <chave>` no header             |
| `Model 'x' is not active`             | Modelo não foi carregado no servidor               | Carregue um modelo antes de fazer requests |
| `Llama context not found`             | Modelo foi descarregado durante a requisição       | Recarregue o modelo                        |
| `No body`                              | Request POST sem body JSON                         | Envie o body no formato correto            |
| Timeout / resposta lenta               | Modelo grande ou device com pouca RAM              | Use um modelo menor ou aumente `n_gpu_layers` |

---

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                  Dispositivo Android             │
│                                                  │
│  ┌──────────────┐      ┌──────────────────────┐ │
│  │  Talos App   │      │   API Server (porta  │ │
│  │              │─────▶│   1234)              │ │
│  │  - UI        │      │                      │ │
│  │  - Models    │      │  - HTTP Router       │ │
│  │  - Download  │      │  - Auth Middleware    │ │
│  └──────────────┘      │  - llama.rn Context  │ │
│                        └──────────┬───────────┘ │
│                                   │              │
│                        ┌──────────▼───────────┐ │
│                        │   llama.rn (Native)  │ │
│                        │   - GGUF Model       │ │
│                        │   - Inference Engine  │ │
│                        └──────────────────────┘ │
└─────────────────────────────────────────────────┘
                       │
                       │ HTTP (WiFi/Rede local)
                       ▼
              ┌─────────────────┐
              │  Outras Apps /  │
              │  Computadores   │
              │  na mesma rede  │
              └─────────────────┘
```

**Fluxo de uma requisição:**

1. Cliente envia HTTP request para `http://<IP>:1234/v1/chat/completions`
2. O servidor valida a API Key (se aplicável)
3. O body é parseado e o prompt é extraído
4. O prompt é enviado ao contexto `llama.rn` correspondente ao modelo
5. O modelo gera tokens até atingir `max_tokens` ou uma sequência `stop`
6. A resposta é formatada no padrão OpenAI e retornada ao cliente

---

## Configuração no App

| Parâmetro       | Padrão                    | Descrição                            |
|-----------------|---------------------------|--------------------------------------|
| **Porta**       | `1234`                    | Porta do servidor HTTP               |
| **API Key**     | `lm-studio-v1-key-secret` | Chave de autenticação Bearer         |
| **IP Manual**   | Desativado                | Permite definir um IP manualmente    |
| **Threads CPU** | `4`                       | Threads de inferência por modelo     |
| **GPU Layers**  | `20`                      | Camadas delegadas à GPU (se suportado)|
| **Contexto**    | `2048`                    | Tamanho do contexto em tokens        |
| **Mlock**       | `true`                    | Travar modelo na RAM (evita swap)    |

---

## Limitações Técnicas

| Limite | Descrição |
|--------|-----------|
| **Sem Streaming** | O servidor não suporta Server-Sent Events (SSE) ou streaming. Todas as respostas são completas (JSON único). |
| **Sem Contexto de Conversa** | Cada requisição é independente. O servidor usa apenas a **última mensagem** da lista como prompt. Não há janela de contexto automática. |
| **Content-Type Obrigatório** | Para endpoints POST, envie `Content-Type: application/json` no header. Sem isso, o body pode não ser processado. |
| **Tamanho Máximo** | Depende da memória RAM disponível. Modelos grandes podem causar crash se o dispositivo não tiver RAM suficiente. |

---

## Respostas de Erro

Todas as respostas de erro são JSON com o formato:

```json
{
  "error": {
    "message": "Descrição do erro",
    "type": "invalid_request_error" | "server_error",
    "code": "código_opcional"
  }
}
```

| Código HTTP | Significado |
|-------------|-------------|
| `400` | Requisição inválida (body ausente, modelo inativo, parâmetros incorretos) |
| `401` | Chave de API inválida ou ausente |
| `404` | Endpoint não encontrado |
| `500` | Erro interno do servidor |

**Exemplo de erro 400:**

```json
{
  "error": {
    "message": "Request body is required. Send JSON with Content-Type: application/json",
    "type": "invalid_request_error"
  }
}
```

**Exemplo de erro 404 (endpoint não existe):**

```json
{
  "error": {
    "message": "Endpoint not found: GET /invalid-path",
    "type": "invalid_request_error",
    "available_endpoints": [
      "GET  /health",
      "GET  /v1/models",
      "POST /v1/chat/completions",
      "POST /v1/completions"
    ]
  }
}
```

---

## Compatibilidade

A API é compatível com qualquer ferramenta que suporte o formato OpenAI:

- **OpenAI Python SDK** — `base_url="http://<IP>:1234/v1"`
- **OpenAI Node.js SDK** — `baseURL: "http://<IP>:1234/v1"`
- **LangChain** — Use `ChatOpenAI` com `openai_api_base`
- **Continue.dev** — Configure como provider local
- **Cursor / VS Code** — Aponte para o endereço do servidor
- **Postman / Insomnia** — Teste os endpoints diretamente
- **cURL** — Funciona imediatamente

---

*Talos LLM Studio — LLM local no seu bolso.*
