import http from "node:http";
import { handleUpdate, cron } from "./bot.js";
import { env } from "./config.js";

const PORT = process.env.PORT || 10000;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();

      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

async function webhook(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 200, {
      ok: true,
      message: "Telegram webhook ishlayapti"
    });
  }

  if (
    env.WEBHOOK_SECRET &&
    req.headers["x-telegram-bot-api-secret-token"] !== env.WEBHOOK_SECRET
  ) {
    return sendJson(res, 403, {
      ok: false,
      error: "Forbidden"
    });
  }

  try {
    const update = await readBody(req);

    await handleUpdate(update);

    return sendJson(res, 200, {
      ok: true
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return sendJson(res, 200, {
      ok: false,
      error: error.message
    });
  }
}

async function runCron(req, res) {
  if (
    env.CRON_SECRET &&
    req.headers["x-cron-secret"] !== env.CRON_SECRET
  ) {
    return sendJson(res, 403, {
      ok: false,
      error: "Forbidden"
    });
  }

  try {
    const result = await cron();

    return sendJson(res, 200, result || {
      ok: true
    });
  } catch (error) {
    console.error("Cron error:", error);

    return sendJson(res, 500, {
      ok: false,
      error: error.message
    });
  }
}

async function setWebhook() {
  if (!env.BOT_TOKEN) {
    console.log("BOT_TOKEN topilmadi.");
    return;
  }

  const baseUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.APP_URL;

  if (!baseUrl) {
    console.log("RENDER_EXTERNAL_URL topilmadi.");
    return;
  }

  const webhookUrl =
    `${baseUrl.replace(/\/$/, "")}/api/webhook`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: env.WEBHOOK_SECRET || undefined,
          allowed_updates: [
            "message",
            "callback_query"
          ]
        })
      }
    );

    const result = await response.json();

    if (result.ok) {
      console.log("Telegram webhook o‘rnatildi.");
      console.log(webhookUrl);
    } else {
      console.error(
        "Webhook o‘rnatilmadi:",
        result.description
      );
    }
  } catch (error) {
    console.error(
      "Webhook ulash xatosi:",
      error.message
    );
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    // Server tekshirish
    if (
      req.method === "GET" &&
      (url.pathname === "/" ||
       url.pathname === "/health")
    ) {
      return sendJson(res, 200, {
        ok: true,
        service: "eFootball Premier League Bot",
        status: "running"
      });
    }

    // Telegram
    if (url.pathname === "/api/webhook") {
      return await webhook(req, res);
    }

    // Cron
    if (url.pathname === "/api/cron") {
      return await runCron(req, res);
    }

    return sendJson(res, 404, {
      ok: false,
      error: "Not found"
    });

  } catch (error) {
    console.error("Server error:", error);

    return sendJson(res, 500, {
      ok: false,
      error: "Internal server error"
    });
  }
});

server.listen(PORT, async () => {
  console.log(
    `Bot ${PORT}-portda ishga tushdi.`
  );

  await setWebhook();

  // Har 1 daqiqada deadline tekshiriladi
  setInterval(async () => {
    try {
      await cron();
    } catch (error) {
      console.error(
        "Automatic cron error:",
        error.message
      );
    }
  }, 60 * 1000);
});
