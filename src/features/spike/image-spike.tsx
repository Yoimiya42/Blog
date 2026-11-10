"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { processBrowserImage } from "./image.browser";
import { containsExifMetadata } from "./image.shared";

const fixtures = [
  {
    expectedHeight: 667,
    expectedWidth: 1000,
    name: "Public HEIC",
    url: "https://media-spike.fangmingluan.com/fixtures/libheif-example.heic",
  },
  {
    expectedHeight: 450,
    expectedWidth: 600,
    name: "EXIF orientation 6 JPEG",
    url: "https://media-spike.fangmingluan.com/fixtures/sharp-landscape-6.jpg",
  },
] as const;

interface FixtureResult {
  durationMs: number;
  inputBytes: number;
  name: string;
  outputBytes: number;
  outputDimensions: string;
  previewUrl: string;
  status: "failed" | "passed";
}

async function processFixture(
  fixture: (typeof fixtures)[number],
): Promise<FixtureResult> {
  const response = await fetch(fixture.url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Fixture request failed with status ${response.status}.`);
  }

  const input = await response.blob();
  const startedAt = performance.now();
  const output = await processBrowserImage(input, {
    longEdge: 1000,
    outputType: "image/webp",
    quality: 82,
  });
  const durationMs = Math.round(performance.now() - startedAt);
  const passed =
    output.width === fixture.expectedWidth &&
    output.height === fixture.expectedHeight &&
    output.contentType === "image/webp" &&
    !containsExifMetadata(output.body);
  const previewUrl = URL.createObjectURL(
    new Blob([output.body.buffer as ArrayBuffer], {
      type: output.contentType,
    }),
  );

  return {
    durationMs,
    inputBytes: input.size,
    name: fixture.name,
    outputBytes: output.size,
    outputDimensions: `${output.width}×${output.height}`,
    previewUrl,
    status: passed ? "passed" : "failed",
  };
}

export function ImageSpike() {
  const [results, setResults] = useState<FixtureResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const nextResults = [];

        for (const fixture of fixtures) {
          nextResults.push(await processFixture(fixture));
        }

        if (active) {
          setResults(nextResults);
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Image processing failed.",
          );
        }
      } finally {
        if (active) {
          setRunning(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
      results.forEach((result) => URL.revokeObjectURL(result.previewUrl));
    };
  }, [results]);

  return (
    <main>
      <h1>Browser image pipeline spike</h1>
      <p>
        This route processes public HEIC and oriented JPEG fixtures entirely in
        the browser. It loads no runtime CDN.
      </p>
      <p data-status={running ? "running" : error ? "failed" : "complete"}>
        {running ? "Running…" : (error ?? "Complete")}
      </p>
      <table>
        <thead>
          <tr>
            <th>Fixture</th>
            <th>Result</th>
            <th>Dimensions</th>
            <th>Input bytes</th>
            <th>Output bytes</th>
            <th>Duration</th>
            <th>Preview</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.name} data-result={result.status}>
              <td>{result.name}</td>
              <td>{result.status}</td>
              <td>{result.outputDimensions}</td>
              <td>{result.inputBytes}</td>
              <td>{result.outputBytes}</td>
              <td>{result.durationMs} ms</td>
              <td>
                <Image
                  alt={`${result.name} processed preview`}
                  height={90}
                  src={result.previewUrl}
                  unoptimized
                  width={120}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
