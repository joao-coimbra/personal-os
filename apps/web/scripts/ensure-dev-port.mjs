import { createServer } from "node:net";

const port = Number(process.env.PORT ?? process.argv[2] ?? 3001);

const server = createServer();

server.once("error", (error) => {
  const code = "code" in error ? error.code : undefined;
  if (code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the existing Vite process before starting another one — a failed second start can wipe node_modules/.vite/deps and break lazy routes (504 Outdated Optimize Dep).`
    );
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

server.listen(port, "localhost", () => {
  server.close(() => {
    process.exit(0);
  });
});
