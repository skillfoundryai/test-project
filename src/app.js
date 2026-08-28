const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { domain } = require("./domain/delivery");

const routes = new Map([
  ["GET /health", ({ now }) => ({
    status: 200,
    body: {
      status: "ok",
      service: "trayway-logistics-backend",
      timestamp: now().toISOString(),
    },
  })],
  ["GET /api/v1/domain", () => ({ status: 200, body: { data: domain } })],
]);
console.log(routes);
console.log("Registered routes:");
function sendJson(response, status, body, requestId) {
  const payload = JSON.stringify(body);

  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "x-request-id": requestId,
  });
  response.end(payload);
}

function createApp(options = {}) {
  const now = options.now ?? (() => new Date());
  const createRequestId = options.createRequestId ?? randomUUID;

  console.log("Starting server with the following options:");
  return http.createServer((request, response) => {
    const requestId = createRequestId();
    const url = new URL(request.url, "http://localhost");
    const route = routes.get(`${request.method} ${url.pathname}`);

    if (route) {
      const result = route({ now });
      sendJson(response, result.status, result.body, requestId);
      return;
    }

    const pathExists = [...routes.keys()].some((key) => key.endsWith(` ${url.pathname}`));
    if (pathExists) {
      sendJson(response, 405, {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: `Method ${request.method} is not allowed for ${url.pathname}.`,
        },
      }, requestId);
      return;
    }

    sendJson(response, 404, {
      error: {
        code: "NOT_FOUND",
        message: `No route exists for ${request.method} ${url.pathname}.`,
      },
    }, requestId);
  });
}

module.exports = { createApp };
