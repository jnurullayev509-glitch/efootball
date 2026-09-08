import http from "node:http";
import { handleUpdate } from "./webhook.js";
import { runCron } from "./cron.js";

const PORT = process.env.PORT || 10000;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    // Server ishlayotganini tekshirish
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          ok: true,
          message: "eFootball League Bot ishlayapti"
        })
      );

      return;
    }

    // Telegram webhook
    if (req.method === "POST" && url.pathname === "/api/webhook") {
      let body = "";

      req.on("data", chunk => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const update = JSON.parse(body);

          await handleUpdate(update);

          res.writeHead(200, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          console.error("Webhook xatosi:", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(
            JSON.stringify({
              ok: false,
              error: error.message
            })
          );
        }
      });

      return;
    }

    // Cron
    if (
      (req.method === "GET" || req.method === "POST") &&
      url.pathname === "/api/cron"
    ) {
      const secret = req.headers["x-cron-secret"];

      if (
        process.env.CRON_SECRET &&
        secret !== process.env.CRON_SECRET
      ) {
        res.writeHead(403, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          ok: false,
          error: "Forbidden"
        }));

        return;
      }

      const result = await runCron();

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify(result || { ok: true })
      );

      return;
    }

    // Noma'lum manzil
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        ok: false,
        error: "Not found"
      })
    );
  } catch (error) {
    console.error("Server xatosi:", error);

    res.writeHead(500, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        ok: false,
        error: "Internal server error"
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(
    `eFootball League Bot ${PORT}-portda ishga tushdi`
  );
});
