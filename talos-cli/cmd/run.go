package cmd

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

var (
	runModel    string
	runSystem   string
	runMaxTokens int
)

var runCmd = &cobra.Command{
	Use:   "run [model]",
	Short: "Interactive chat with a model",
	Long:  "Load a model and start an interactive chat session via the Talos Engine API.",
	Args:  cobra.MaximumNArgs(1),
	RunE:  runChat,
}

func init() {
	runCmd.Flags().StringVarP(&runSystem, "system", "s", "You are Talos, a helpful AI assistant.", "System prompt")
	runCmd.Flags().IntVarP(&runMaxTokens, "max-tokens", "n", 2048, "Max tokens to generate")
}

type ChatAPIRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMsg     `json:"messages"`
	Stream   bool          `json:"stream"`
	Options  *ChatOptions  `json:"options,omitempty"`
}

type ChatMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatOptions struct {
	NumPredict *int `json:"num_predict,omitempty"`
}

type ChatAPIResponse struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
	Done    bool   `json:"done"`
	Error   string `json:"error,omitempty"`
}

func runChat(cmd *cobra.Command, args []string) error {
	if len(args) > 0 {
		runModel = args[0]
	}

	fmt.Println("Talos Interactive Chat")
	fmt.Println("Commands: /quit, /clear, /system <prompt>, /model <name>")
	fmt.Println()

	messages := []ChatMsg{
		{Role: "system", Content: runSystem},
	}

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("You: ")
		if !scanner.Scan() {
			break
		}
		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}

		switch {
		case input == "/quit" || input == "/exit":
			fmt.Println("Goodbye!")
			return nil

		case input == "/clear":
			messages = []ChatMsg{{Role: "system", Content: runSystem}}
			fmt.Println("Conversation cleared.")
			continue

		case strings.HasPrefix(input, "/system "):
			runSystem = strings.TrimPrefix(input, "/system ")
			messages = []ChatMsg{{Role: "system", Content: runSystem}}
			fmt.Printf("System prompt: %s\n", runSystem)
			continue

		case strings.HasPrefix(input, "/model "):
			runModel = strings.TrimPrefix(input, "/model ")
			fmt.Printf("Model: %s\n", runModel)
			continue
		}

		messages = append(messages, ChatMsg{Role: "user", Content: input})

		fmt.Print("Talos: ")
		response, err := chatCompletion(messages)
		if err != nil {
			fmt.Printf("\nError: %v\n", err)
			continue
		}
		fmt.Println(response)

		messages = append(messages, ChatMsg{Role: "assistant", Content: response})
	}

	return nil
}

func chatCompletion(messages []ChatMsg) (string, error) {
	reqBody := ChatAPIRequest{
		Model:    runModel,
		Messages: messages,
		Stream:   false,
		Options: &ChatOptions{
			NumPredict: &runMaxTokens,
		},
	}

	data, _ := json.Marshal(reqBody)
	resp, err := http.Post(engineURL+"/api/chat", "application/json", bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("failed to connect to engine at %s: %w", engineURL, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var chatResp ChatAPIResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", fmt.Errorf("invalid response: %s", string(body))
	}

	if chatResp.Error != "" {
		return "", fmt.Errorf("%s", chatResp.Error)
	}

	return chatResp.Message.Content, nil
}
