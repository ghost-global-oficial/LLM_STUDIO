import argparse
import json
import sys
import os
import threading
import time
import gc
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    from airllm import AutoModel, AutoTokenizer
except ImportError:
    print("ERROR: airllm not installed. Run: pip install airllm")
    sys.exit(1)

current_model = None
current_tokenizer = None
current_model_path = None
model_lock = threading.Lock()


class AirLLMHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/health' or self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "server": "airllm",
                "status": "ready",
                "model_loaded": current_model is not None,
                "model_path": current_model_path
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return

        if self.path == '/load':
            self.handle_load(data)
        elif self.path == '/unload':
            self.handle_unload()
        elif self.path == '/generate':
            self.handle_generate(data)
        else:
            self.send_response(404)
            self.end_headers()

    def handle_load(self, data):
        global current_model, current_tokenizer, current_model_path
        model_path = data.get('model_path', '')
        if not model_path:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "model_path required"}).encode())
            return

        with model_lock:
            try:
                if current_model is not None:
                    del current_model
                    del current_tokenizer
                    gc.collect()

                print(f"Loading model: {model_path}")
                current_tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
                current_model = AutoModel.from_pretrained(model_path, trust_remote_code=True)
                current_model_path = model_path
                print(f"Model loaded: {model_path}")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "model": model_path}).encode())
            except Exception as e:
                current_model = None
                current_tokenizer = None
                current_model_path = None
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())

    def handle_unload(self):
        global current_model, current_tokenizer, current_model_path
        with model_lock:
            if current_model is not None:
                del current_model
                del current_tokenizer
                current_model = None
                current_tokenizer = None
                current_model_path = None
                gc.collect()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())

    def handle_generate(self, data):
        global current_model, current_tokenizer
        prompt = data.get('prompt', '')
        max_tokens = data.get('max_tokens', 512)

        if not prompt:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "prompt required"}).encode())
            return

        with model_lock:
            if current_model is None:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No model loaded"}).encode())
                return

            try:
                input_ids = current_tokenizer(prompt, return_tensors='pt').input_ids
                outputs = current_model.generate(
                    input_ids,
                    max_new_tokens=max_tokens,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9
                )
                generated = current_tokenizer.decode(outputs[0][input_ids.shape[1]:], skip_special_tokens=True)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "response": generated,
                    "model": current_model_path
                }).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=11436)
    args = parser.parse_args()

    server = HTTPServer(('127.0.0.1', args.port), AirLLMHandler)
    print(f"READY - AirLLM server on http://127.0.0.1:{args.port}")
    sys.stdout.flush()
    server.serve_forever()


if __name__ == '__main__':
    main()
