package cmd

import (
	"github.com/spf13/cobra"
)

var (
	engineURL string
)

var rootCmd = &cobra.Command{
	Use:   "talos-cli",
	Short: "Talos CLI - Independent AI inference engine",
	Long:  "Talos CLI is a high-performance AI inference engine.\nIt manages models, provides Ollama-compatible API, and interactive chat.",
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		return nil
	},
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.PersistentFlags().StringVar(&engineURL, "url", "http://127.0.0.1:11435", "Talos Engine API URL")
	rootCmd.AddCommand(serveCmd)
	rootCmd.AddCommand(pullCmd)
	rootCmd.AddCommand(listCmd)
	rootCmd.AddCommand(rmCmd)
	rootCmd.AddCommand(runCmd)
	rootCmd.AddCommand(showCmd)
	rootCmd.AddCommand(statusCmd)
	rootCmd.AddCommand(versionCmd)
}
