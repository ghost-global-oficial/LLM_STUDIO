import argparse
import json
import sys
import os
import gc
import base64
import io
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

try:
    from diffusers import StableDiffusionPipeline, AutoPipelineForText2Image
    HAS_DIFFUSERS = True
except ImportError:
    HAS_DIFFUSERS = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

current_pipe = None
current_model_id = None
model_lock = threading.Lock()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'models')

def _local_model(name):
    p = os.path.join(MODELS_DIR, name)
    if os.path.isdir(p) and os.path.exists(os.path.join(p, 'model_index.json')):
        return p
    return None

SD_MODELS = {
    'sd-1.5': _local_model('sd-1.5') or 'runwayml/stable-diffusion-v1-5',
    'sd-2.1': 'stabilityai/stable-diffusion-2-1',
    'sd-3.5': 'stabilityai/stable-diffusion-3.5-large',
    'sdxl': 'stabilityai/stable-diffusion-xl-base-1.0',
    'flux-schnell': 'black-forest-labs/FLUX.1-schnell',
    'flux-dev': 'black-forest-labs/FLUX.1-dev',
}

SD_MODELS_LOW_RAM = {
    'sd-1.5': _local_model('sd-1.5') or 'runwayml/stable-diffusion-v1-5',
    'sd-2.1': 'stabilityai/stable-diffusion-2-1',
    'sdxl': 'stabilityai/stable-diffusion-xl-base-1.0',
}


class ImageGenHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/health' or self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            info = {
                "server": "talos-image-gen",
                "status": "ready",
                "torch": HAS_TORCH,
                "diffusers": HAS_DIFFUSERS,
                "pil": HAS_PIL,
                "model_loaded": current_pipe is not None,
                "model_id": current_model_id,
                "gpu": str(torch.cuda.is_available()) if HAS_TORCH else "unknown",
            }
            self.wfile.write(json.dumps(info).encode())
        elif self.path == '/models':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"models": list(SD_MODELS.keys())}).encode())
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
        global current_pipe, current_model_id
        model_key = data.get('model', 'sd-1.5')
        low_ram = data.get('low_ram', False)

        model_id = SD_MODELS.get(model_key) or SD_MODELS_LOW_RAM.get(model_key) or model_key

        if not HAS_TORCH or not HAS_DIFFUSERS:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "torch or diffusers not installed"}).encode())
            return

        with model_lock:
            try:
                if current_pipe is not None:
                    del current_pipe
                    gc.collect()
                    if HAS_TORCH and torch.cuda.is_available():
                        torch.cuda.empty_cache()

                print(f"Loading model: {model_id}")
                dtype = torch.float16 if torch.cuda.is_available() else torch.float32
                device = "cuda" if torch.cuda.is_available() else "cpu"
                is_local = os.path.isdir(model_id)

                load_kwargs = {"torch_dtype": dtype}
                if not is_local and dtype == torch.float16:
                    load_kwargs["variant"] = "fp16"

                if low_ram and torch.cuda.is_available():
                    current_pipe = AutoPipelineForText2Image.from_pretrained(model_id, **load_kwargs)
                    current_pipe.enable_model_cpu_offload()
                else:
                    current_pipe = AutoPipelineForText2Image.from_pretrained(model_id, **load_kwargs).to(device)

                current_model_id = model_id
                print(f"Model loaded: {model_id}")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "model": model_id}).encode())
            except Exception as e:
                current_pipe = None
                current_model_id = None
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())

    def handle_unload(self):
        global current_pipe, current_model_id
        with model_lock:
            if current_pipe is not None:
                del current_pipe
                current_pipe = None
                current_model_id = None
                gc.collect()
                if HAS_TORCH and torch.cuda.is_available():
                    torch.cuda.empty_cache()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())

    def handle_generate(self, data):
        global current_pipe
        prompt = data.get('prompt', '')
        negative_prompt = data.get('negative_prompt', '')
        width = data.get('width', 512)
        height = data.get('height', 512)
        steps = data.get('steps', 20)
        guidance = data.get('guidance_scale', 7.5)
        seed = data.get('seed', -1)
        output_format = data.get('format', 'png')

        if not prompt:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "prompt required"}).encode())
            return

        with model_lock:
            if current_pipe is None:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No model loaded"}).encode())
                return

            try:
                generator = None
                if seed >= 0 and HAS_TORCH:
                    generator = torch.Generator(device=current_pipe.device).manual_seed(seed)

                print(f"Generating: {prompt[:80]}...")
                result = current_pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt or None,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=guidance,
                    generator=generator,
                )

                image = result.images[0]
                buffered = io.BytesIO()
                image.save(buffered, format=output_format.upper())
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "image": f"data:image/{output_format};base64,{img_base64}",
                    "width": image.width,
                    "height": image.height,
                }).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=11437)
    args = parser.parse_args()

    server = HTTPServer(('127.0.0.1', args.port), ImageGenHandler)
    print(f"READY - Talos Image Gen on http://127.0.0.1:{args.port}")
    sys.stdout.flush()
    server.serve_forever()


if __name__ == '__main__':
    main()
