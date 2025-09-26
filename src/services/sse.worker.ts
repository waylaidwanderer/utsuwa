const API_BASE_URL = '';
let abortController: AbortController | null = null;

async function startListening(sessionId: string) {
  console.log(`[Worker] Received start for session: ${sessionId}`);
  if (abortController) {
    console.log('[Worker] Aborting existing fetch request.');
    abortController.abort();
  }

  abortController = new AbortController();
  const url = `${API_BASE_URL}/api/sessions/${sessionId}/listen`;
  console.log(`[Worker] Attempting to connect to: ${url}`);

  try {
    const response = await fetch(url, { signal: abortController.signal });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to connect: ${response.statusText}`);
    }
    console.log('[Worker] Fetch connection opened successfully.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[Worker] Stream finished.');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

      for (const line of lines) {
        if (line.trim()) {
          try {
            console.log('[Worker] Received line:', line);
            const parsed = JSON.parse(line);
            if (parsed.type === 'ping') {
              continue;
            }
            self.postMessage(parsed);
          } catch (e) {
            console.error('[Worker] JSON Parse Error:', e);
          }
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[Worker] Fetch aborted as requested.');
    } else {
      console.error('[Worker] Fetch failed:', error);
      self.postMessage({ 
        type: 'connection_error', 
        error: { 
          message: 'Connection to the server was lost. Please check if the server is running and refresh the page.' 
        } 
      });
    }
  } finally {
    console.log('[Worker] Cleaning up connection.');
    abortController = null;
  }
}

self.onmessage = (event) => {
  const { type, sessionId } = event.data;

  if (type === 'start') {
    startListening(sessionId);
  } else if (type === 'stop') {
    console.log(`[Worker] Received stop for session: ${sessionId}`);
    if (abortController) {
      abortController.abort();
    }
  }
};
