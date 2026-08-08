import { aiLogger } from './aiLogger.js';

/**
 * Server-Sent Events (SSE) Streaming Engine for OpenAI-compatible API responses
 */
export class AIStreamHandler {
  /**
   * Pipes an SSE stream from an upstream OpenAI fetch Response directly to an Express HTTP Response object.
   * Returns a promise that resolves with the fully accumulated message content once streaming completes.
   */
  static async handleStream({ upstreamResponse, expressRes, onChunk = null }) {
    return new Promise((resolve, reject) => {
      // Set SSE headers on Express response
      expressRes.setHeader('Content-Type', 'text/event-stream');
      expressRes.setHeader('Cache-Control', 'no-cache, no-transform');
      expressRes.setHeader('Connection', 'keep-alive');
      expressRes.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if applicable
      expressRes.flushHeaders?.();

      let accumulatedContent = '';
      let buffer = '';

      const bodyStream = upstreamResponse.body;
      if (!bodyStream) {
        return reject(new Error('Upstream response body is null or not readable'));
      }

      // Handle Node.js stream / Web ReadableStream
      const reader = typeof bodyStream.getReader === 'function' ? bodyStream.getReader() : null;

      if (reader) {
        // Web ReadableStream processing (standard in fetch API)
        const processWebStream = async () => {
          try {
            const decoder = new TextDecoder('utf-8');
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunkText = decoder.decode(value, { stream: true });
              buffer += chunkText;
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;

                if (trimmed === 'data: [DONE]') {
                  expressRes.write(`data: [DONE]\n\n`);
                  continue;
                }

                if (trimmed.startsWith('data: ')) {
                  const jsonStr = trimmed.slice(6);
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const deltaContent = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
                    if (deltaContent) {
                      accumulatedContent += deltaContent;
                      if (onChunk) onChunk(deltaContent);
                    }
                    expressRes.write(`data: ${JSON.stringify({ content: deltaContent, done: false })}\n\n`);
                  } catch (e) {
                    // Ignore line parse errors during chunking
                  }
                }
              }
            }

            expressRes.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
            expressRes.end();
            resolve(accumulatedContent);
          } catch (err) {
            aiLogger.error('Error during SSE stream reading:', { error: err.message });
            expressRes.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
            expressRes.end();
            reject(err);
          }
        };

        processWebStream();
      } else {
        // Node.js Stream processing
        bodyStream.on('data', (chunk) => {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed === 'data: [DONE]') {
              expressRes.write(`data: [DONE]\n\n`);
              continue;
            }

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                const deltaContent = parsed.choices?.[0]?.delta?.content || '';
                if (deltaContent) {
                  accumulatedContent += deltaContent;
                  if (onChunk) onChunk(deltaContent);
                }
                expressRes.write(`data: ${JSON.stringify({ content: deltaContent, done: false })}\n\n`);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        });

        bodyStream.on('end', () => {
          expressRes.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
          expressRes.end();
          resolve(accumulatedContent);
        });

        bodyStream.on('error', (err) => {
          aiLogger.error('Node stream error:', { error: err.message });
          expressRes.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
          expressRes.end();
          reject(err);
        });
      }
    });
  }
}
