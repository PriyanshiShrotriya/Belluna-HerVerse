import { createServer } from 'node:http';
import handler from '../explain';

const port = Number(process.env.API_PORT ?? 8788);

const server = createServer(async (request, response) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8');
  const vercelResponse = {
    setHeader(name: string, value: string) {
      response.setHeader(name, value);
      return this;
    },
    status(code: number) {
      response.statusCode = code;
      return this;
    },
    json(value: unknown) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(value));
      return this;
    },
  };

  await handler(
    { method: request.method, body },
    vercelResponse,
  );
});

server.listen(port, () => {
  console.log(`Translator API listening on http://localhost:${port}/api/explain`);
});
