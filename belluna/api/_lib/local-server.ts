
import { createServer } from 'node:http';
import explainHandler from '../explain';
import newsHandler from '../awareness/news';

const port = Number(process.env.API_PORT ?? 8788);

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
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

  try {
    if (url.pathname === '/api/explain') {
      await explainHandler(
        { method: request.method, body },
        vercelResponse,
      );
      return;
    }

    if (url.pathname === '/api/awareness/news') {
      await newsHandler(
        {
          method: request.method,
          query: Object.fromEntries(url.searchParams.entries()),
        },
        vercelResponse,
      );
      return;
    }

    response.statusCode = 404;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'API route not found' }));
  } catch (error) {
    console.error('API request failed:', error);

    if (!response.writableEnded) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
