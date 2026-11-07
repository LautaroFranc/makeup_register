import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getClaudeConfigPath() {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  } else {
    // macOS
    const home = process.env.HOME || "";
    return path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
}

export async function GET() {
  try {
    const configPath = getClaudeConfigPath();
    const serverScriptPath = path.resolve(process.cwd(), "src/mcp/server.mjs").replace(/\\/g, "/");

    let isConfigured = false;
    let configData: any = null;

    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf8");
        configData = JSON.parse(raw);
        if (configData.mcpServers?.["makeup-inventory"] || configData.mcpServers?.["nova-inventory"]) {
          isConfigured = true;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      configPath,
      serverScriptPath,
      isConfigured,
      configData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al verificar configuración" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const configPath = getClaudeConfigPath();
    const configDir = path.dirname(configPath);
    const serverScriptPath = path.resolve(process.cwd(), "src/mcp/server.mjs").replace(/\\/g, "/");

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = { mcpServers: {} };
    if (fs.existsSync(configPath)) {
      try {
        const existing = fs.readFileSync(configPath, "utf8");
        config = JSON.parse(existing);
        if (!config.mcpServers) config.mcpServers = {};
      } catch {
        config = { mcpServers: {} };
      }
    }

    // Configurar el servidor para Nova Insumos
    config.mcpServers["nova-inventory"] = {
      command: "node",
      args: [serverScriptPath],
      env: {
        NODE_ENV: "production",
      },
    };
    // Mantener compatibilidad si se llamaba makeup-inventory
    config.mcpServers["makeup-inventory"] = {
      command: "node",
      args: [serverScriptPath],
      env: {
        NODE_ENV: "production",
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      message: "¡Configuración instalada automáticamente en Claude Desktop!",
      configPath,
      serverScriptPath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al conectar Claude Desktop" },
      { status: 500 }
    );
  }
}
