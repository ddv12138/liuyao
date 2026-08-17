/** Minimal standard SSE parser shared by the server and browser clients. */

export interface SseEvent {
  data: string;
}

export class SseParser {
  private buffer = "";

  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    return this.readFrames(false);
  }

  end(): SseEvent[] {
    return this.readFrames(true);
  }

  private readFrames(flush: boolean): SseEvent[] {
    const events: SseEvent[] = [];

    while (true) {
      const separator = this.buffer.match(/\r\n\r\n|\n\n|\r\r/);
      if (!separator || separator.index === undefined) break;

      const frame = this.buffer.slice(0, separator.index);
      this.buffer = this.buffer.slice(separator.index + separator[0].length);
      const event = parseSseFrame(frame);
      if (event) events.push(event);
    }

    if (flush && this.buffer.length > 0) {
      const event = parseSseFrame(this.buffer);
      this.buffer = "";
      if (event) events.push(event);
    }

    return events;
  }
}

function parseSseFrame(frame: string): SseEvent | null {
  const dataLines: string[] = [];
  for (const line of frame.split(/\r\n|\n|\r/)) {
    if (!line.startsWith("data:")) continue;
    const value = line.slice(5);
    dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
  }

  return dataLines.length > 0 ? { data: dataLines.join("\n") } : null;
}
