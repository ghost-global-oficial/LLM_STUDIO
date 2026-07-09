package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Show version info",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("talos-cli version 1.0.0")
		fmt.Println("Powered by llama.cpp")
		fmt.Println("Ollama-compatible API")
	},
}
