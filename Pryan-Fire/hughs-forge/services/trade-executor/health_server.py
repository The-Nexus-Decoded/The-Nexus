import http.server
import socketserver
import json
import threading
import logging

logger = logging.getLogger(__name__)

class HealthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            logger.info(f"Health check requested from {self.client_address[0]}. Status: OK")
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"status": "error", "message": "Not Found"}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            logger.warning(f"Invalid path requested from {self.client_address[0]}: {self.path}. Status: 404 Not Found")

def start_health_server(port=8000):
    global httpd # Make httpd accessible for graceful shutdown
    Handler = HealthHandler
    httpd = socketserver.TCPServer(("", port), Handler)
    logger.info(f"Health server starting on port {port}...")
    try:
        httpd.serve_forever()
    except Exception as e:
        logger.error(f"Health server error: {e}")

def stop_health_server():
    if httpd:
        logger.info("Health server shutting down...")
        httpd.shutdown()
        httpd.server_close()

if __name__ == '__main__':
    # For testing the health server independently
    import datetime # Import here for independent test run
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    start_health_server(port=8001)
