import http.server
import socketserver
import json
import logging
import datetime

logger = logging.getLogger(__name__)

# Standard version for the fleet
SERVICE_VERSION = "1.0.0"

class HealthHandler(http.server.BaseHTTPRequestHandler):
    # Dependency check placeholders
    dependencies_healthy = True
    pyth_healthy = True
    solana_healthy = True

    def do_GET(self):
        if self.path == '/health':
            overall_healthy = self.dependencies_healthy and self.pyth_healthy and self.solana_healthy
            self.send_response(200 if overall_healthy else 503)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "status": "healthy" if overall_healthy else "unhealthy",
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "version": SERVICE_VERSION,
                "checks": {
                    "pyth_hermes": "ok" if self.pyth_healthy else "error",
                    "solana_rpc": "ok" if self.solana_healthy else "error"
                }
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            logger.info(f"Health check from {self.client_address[0]}. Status: {response['status']}")
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"status": "error", "message": "Not Found"}
            self.wfile.write(json.dumps(response).encode('utf-8'))

    def log_message(self, format, *args):
        # Suppress noisy standard log output from BaseHTTPRequestHandler
        return

def start_health_server(port=8000):
    global httpd
    Handler = HealthHandler
    # Allow port reuse to avoid 'address already in use' errors during rapid restarts
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", port), Handler)
    logger.info(f"Health server starting on port {port}...")
    try:
        httpd.serve_forever()
    except Exception as e:
        logger.error(f"Health server error: {e}")

def stop_health_server():
    global httpd
    if 'httpd' in globals() and httpd:
        logger.info("Health server shutting down...")
        httpd.shutdown()
        httpd.server_close()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    start_health_server(port=8001)
