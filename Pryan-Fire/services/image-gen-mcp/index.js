import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { GoogleGenAI, Modality } from "@google/genai";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

// --- Config ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set. Export it before starting the MCP server.");
}

const ai = new GoogleGenAI({ apiKey });
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gemini-2.5-flash-image";
const TRANSPORT = process.env.MCP_TRANSPORT || "stdio"; // "stdio" or "http"
const HTTP_PORT = parseInt(process.env.MCP_PORT || "8090", 10);

const server = new McpServer({
  name: "image-gen",
  version: "0.1.0",
});

// --- Helpers ---

/**
 * Tag filename with _aidraft_ per art pipeline convention.
 */
function tagAiDraft(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  if (base.includes("_aidraft_")) return filename;
  return `${base}_aidraft_${Date.now()}${ext}`;
}

/**
 * Extract image + text from Gemini response.
 */
function extractResponse(response) {
  let textNotes = [];
  let imageBuffer = null;

  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) {
        textNotes.push(part.text);
      }
      const inlineData = part.inlineData;
      if (inlineData?.data && inlineData?.mimeType?.startsWith("image/")) {
        imageBuffer = Buffer.from(inlineData.data, "base64");
      }
    }
  }

  return { textNotes, imageBuffer };
}

// --- Tool: generate_image ---
server.tool(
  "generate_image",
  {
    prompt: z.string().min(1).describe("Text prompt describing the image to generate"),
    style: z.string().default("concept-art").describe("Style hint: concept-art, environment-concept, texture-ref, mood-keyframe"),
    output_dir: z.string().default("/data/openclaw/shared/art-pipeline/").describe("Directory to save the generated image"),
    filename: z.string().default("image.png").describe("Output filename (will be auto-tagged with _aidraft_)"),
  },
  async ({ prompt, style, output_dir, filename }) => {
    fs.mkdirSync(output_dir, { recursive: true });

    const fullPrompt = `[Style: ${style}] ${prompt}`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: fullPrompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const { textNotes, imageBuffer } = extractResponse(response);

    if (!imageBuffer) {
      return {
        content: [
          {
            type: "text",
            text: `No image returned by Gemini. Notes: ${textNotes.join("\n") || "none"}`,
          },
        ],
      };
    }

    const taggedFilename = tagAiDraft(filename);
    const savedPath = path.resolve(output_dir, taggedFilename);
    fs.writeFileSync(savedPath, imageBuffer);

    return {
      content: [
        {
          type: "text",
          text: `Image saved: ${savedPath}\nModel: ${IMAGE_MODEL}\nStyle: ${style}\nNotes: ${textNotes.join("\n") || "none"}`,
        },
      ],
    };
  }
);

// --- Tool: iterate_image ---
server.tool(
  "iterate_image",
  {
    image_path: z.string().min(1).describe("Path to existing image to iterate on"),
    edit_prompt: z.string().min(1).describe("Description of edits to make"),
    output_dir: z.string().optional().describe("Output directory (defaults to same dir as input)"),
    filename: z.string().optional().describe("Output filename (defaults to input name with _aidraft_ and new timestamp)"),
  },
  async ({ image_path, edit_prompt, output_dir, filename }) => {
    if (!fs.existsSync(image_path)) {
      return {
        content: [{ type: "text", text: `Source image not found: ${image_path}` }],
      };
    }

    const imageData = fs.readFileSync(image_path);
    const base64Image = imageData.toString("base64");
    const mimeType = image_path.endsWith(".png") ? "image/png" : "image/jpeg";

    const resolvedOutputDir = output_dir || path.dirname(image_path);
    fs.mkdirSync(resolvedOutputDir, { recursive: true });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Image, mimeType } },
            { text: `Edit this image: ${edit_prompt}` },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const { textNotes, imageBuffer } = extractResponse(response);

    if (!imageBuffer) {
      return {
        content: [
          {
            type: "text",
            text: `No edited image returned. Notes: ${textNotes.join("\n") || "none"}`,
          },
        ],
      };
    }

    const resolvedFilename = filename || tagAiDraft(path.basename(image_path));
    const savedPath = path.resolve(resolvedOutputDir, resolvedFilename);
    fs.writeFileSync(savedPath, imageBuffer);

    return {
      content: [
        {
          type: "text",
          text: `Edited image saved: ${savedPath}\nModel: ${IMAGE_MODEL}\nEdit: ${edit_prompt}\nNotes: ${textNotes.join("\n") || "none"}`,
        },
      ],
    };
  }
);

// --- Tool: generate_3d (stub) ---
server.tool(
  "generate_3d",
  {
    prompt: z.string().optional().describe("Text prompt for 3D generation (if no image provided)"),
    image_path: z.string().optional().describe("Path to concept image for image-to-3D"),
    format: z.enum(["glb", "obj", "fbx"]).default("glb").describe("Output 3D format"),
    output_dir: z.string().default("/data/openclaw/shared/art-pipeline/").describe("Output directory"),
  },
  async ({ prompt, image_path, format, output_dir }) => {
    // Stub — 3D generation requires Meshy/Tripo3D API keys (paid services)
    return {
      content: [
        {
          type: "text",
          text: `3D generation is not yet implemented. Requires Meshy or Tripo3D API keys.\nRequested: prompt="${prompt || "none"}", image="${image_path || "none"}", format=${format}\nPost in #coding and tag @Haplo to provision 3D API keys.`,
        },
      ],
    };
  }
);

// --- Start ---
if (TRANSPORT === "http") {
  // HTTP transport — accessible over the network (ola-claw-main, ola-claw-trade via Tailscale)
  const httpServer = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/mcp") {
      const transport = new StreamableHTTPServerTransport("/mcp");
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } else if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", model: IMAGE_MODEL, transport: "http" }));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
    console.log(`image-gen MCP server listening on http://0.0.0.0:${HTTP_PORT}/mcp`);
    console.log(`Health check: http://0.0.0.0:${HTTP_PORT}/health`);
    console.log(`Model: ${IMAGE_MODEL}`);
  });
} else {
  // Stdio transport — local agents on same machine
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
