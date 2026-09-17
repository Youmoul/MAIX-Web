"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const initialConversation = [
  {
    role: "assistant",
    content:
      "Tell me what you want to compose. We can develop the harmony, melody, instrumentation and musical arc before you generate anything.",
  },
];

const sliceOptions = [4, 8, 16, 32];

function secondsLabel(value) {
  const total = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Home() {
  const [mode, setMode] = useState("sample");
  const [conversation, setConversation] = useState(initialConversation);
  const [text, setText] = useState("");
  const [bpm, setBpm] = useState(92);
  const [duration, setDuration] = useState(20);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [audio, setAudio] = useState(null);

  const [sourceFile, setSourceFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceDuration, setSourceDuration] = useState(0);
  const [referenceStart, setReferenceStart] = useState(0);
  const [referenceSeconds, setReferenceSeconds] = useState(10);

  const [chopMode, setChopMode] = useState("intelligent");
  const [sliceCount, setSliceCount] = useState(16);
  const [chops, setChops] = useState([]);
  const [chopZip, setChopZip] = useState(null);

  const chatRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation, busy]);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const maxReferenceStart = useMemo(
    () => Math.max(0, sourceDuration - Math.min(referenceSeconds, sourceDuration || referenceSeconds)),
    [sourceDuration, referenceSeconds]
  );

  useEffect(() => {
    if (!sourceDuration) return;
    const maxLength = Math.max(0.1, sourceDuration - referenceStart);
    if (referenceSeconds > maxLength) setReferenceSeconds(Math.min(10, maxLength));
    if (referenceStart > sourceDuration) setReferenceStart(0);
  }, [sourceDuration, referenceStart, referenceSeconds]);

  async function fileToBase64(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  function chooseSource(file) {
    if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setSourceUrl(url);
    setSourceDuration(0);
    setReferenceStart(0);
    setReferenceSeconds(10);
    setAudio(null);
    setChops([]);
    setChopZip(null);
    setStatus("");
  }

  async function send() {
    const msg = text.trim();
    if (!msg || busy) return;
    setText("");
    if (msg.toUpperCase() === "SAMPLE") {
      await generateSample();
      return;
    }

    const next = [...conversation, { role: "user", content: msg }];
    setConversation(next);
    setBusy(true);
    setStatus("Maestro is thinking…");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat failed");
      setConversation([...next, { role: "assistant", content: data.reply }]);
      setStatus("");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateSample() {
    if (busy) return;
    if (!sourceFile) {
      setStatus("Add a reference song before generating a SAMPLE.");
      return;
    }

    setBusy(true);
    setAudio(null);
    setStatus("MAIX is composing and generating…");

    try {
      const latestMaestro = [...conversation]
        .reverse()
        .find((message) => message.role === "assistant")?.content || "";

      const response = await fetch("/api/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation,
          bpm: Number(bpm),
          duration: Number(duration),
          reference_audio_base64: await fileToBase64(sourceFile),
          reference_filename: sourceFile.name,
          reference_start: Number(referenceStart),
          reference_seconds: Number(referenceSeconds),
          latest_maestro_direction: latestMaestro,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.type === "error") throw new Error(data.error || "Generation failed");
      if (!data.audio_base64) throw new Error("No WAV returned by MAIX");
      setAudio(`data:audio/wav;base64,${data.audio_base64}`);
      setStatus("Sample ready.");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateChops() {
    if (busy || !sourceFile) {
      if (!sourceFile) setStatus("Add a song before chopping.");
      return;
    }

    setBusy(true);
    setChops([]);
    setChopZip(null);
    setStatus(chopMode === "intelligent" ? "Finding the strongest musical cuts…" : "Cutting equal slices…");

    try {
      const response = await fetch("/api/chop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_base64: await fileToBase64(sourceFile),
          filename: sourceFile.name,
          chop_mode: chopMode,
          slice_count: Number(sliceCount),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.type === "error") throw new Error(data.error || "Chop failed");

      setChops(
        (data.slices || []).map((slice) => ({
          ...slice,
          src: slice.audio_base64 ? `data:audio/wav;base64,${slice.audio_base64}` : null,
        }))
      );
      setChopZip(data.zip_base64 ? `data:application/zip;base64,${data.zip_base64}` : null);
      setStatus(`${data.slice_count || data.slices?.length || 0} chops ready.`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="app-shell">
        <header className="topbar">
          <div>
            <h1>MAIX</h1>
            <p>Maestro AI Music Studio</p>
          </div>
          <span className="version">MAIX B</span>
        </header>

        <nav className="mode-tabs" aria-label="MAIX mode">
          <button className={mode === "sample" ? "active" : ""} onClick={() => setMode("sample")}>SAMPLE</button>
          <button className={mode === "chop" ? "active" : ""} onClick={() => setMode("chop")}>CHOP</button>
        </nav>

        <div className="source-card">
          <div className="section-title">
            <div><strong>Source audio</strong><span>Shared by Sample and Chop</span></div>
            {sourceFile && <em>{sourceFile.name}</em>}
          </div>
          <label className="file-button">
            {sourceFile ? "Change song" : "Choose MP3 / WAV"}
            <input type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" onChange={(e) => chooseSource(e.target.files?.[0])} />
          </label>
          {sourceUrl && (
            <audio
              className="source-player"
              controls
              preload="metadata"
              src={sourceUrl}
              onLoadedMetadata={(e) => setSourceDuration(Number(e.currentTarget.duration) || 0)}
            />
          )}
        </div>

        {mode === "sample" ? (
          <div className="mode-panel sample-panel">
            <div className="sample-controls">
              <label>BPM<input type="number" min="40" max="220" value={bpm} onChange={(e) => setBpm(e.target.value)} /></label>
              <label>
                Reference start <b>{secondsLabel(referenceStart)}</b>
                <input type="range" min="0" max={Math.max(0, maxReferenceStart)} step="0.1" value={Math.min(referenceStart, maxReferenceStart)} disabled={!sourceDuration} onChange={(e) => setReferenceStart(Number(e.target.value))} />
              </label>
              <label>
                Reference length <b>{Number(referenceSeconds).toFixed(1)}s</b>
                <input type="range" min="2" max={Math.max(2, Math.min(30, sourceDuration ? sourceDuration - referenceStart : 30))} step="0.5" value={referenceSeconds} disabled={!sourceDuration} onChange={(e) => setReferenceSeconds(Number(e.target.value))} />
              </label>
              <label>
                Generation <b>{duration}s</b>
                <input type="range" min="5" max="30" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </label>
            </div>

            <div className="chat" ref={chatRef}>
              {conversation.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <small>{message.role === "assistant" ? "MAESTRO" : "YOU"}</small>
                  {message.content}
                </div>
              ))}
              {busy && status === "Maestro is thinking…" && <div className="typing">Maestro is thinking…</div>}
              <div ref={chatBottomRef} />
            </div>

            <div className="composer">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Develop the composition with Maestro…"
              />
              <button onClick={send} disabled={busy}>Send</button>
              <button className="primary" onClick={generateSample} disabled={busy || !sourceFile}>SAMPLE</button>
            </div>

            {audio && (
              <div className="result">
                <div className="section-title"><div><strong>Generated sample</strong><span>MusicGen native WAV</span></div></div>
                <audio controls src={audio} />
                <a className="download" href={audio} download={`maix-${Date.now()}.wav`}>Download WAV</a>
              </div>
            )}
          </div>
        ) : (
          <div className="mode-panel chop-panel">
            <div className="chop-heading">
              <div><strong>Chop mode</strong><span>Turn the source into playable slices.</span></div>
              <div className="segmented">
                <button className={chopMode === "intelligent" ? "active" : ""} onClick={() => setChopMode("intelligent")}>INTELLIGENT</button>
                <button className={chopMode === "equal" ? "active" : ""} onClick={() => setChopMode("equal")}>EQUAL</button>
              </div>
            </div>

            <p className="mode-description">
              {chopMode === "intelligent"
                ? "Find strong musical attacks, cut 2 ms before the transient, and keep slices at least 2 seconds long."
                : "Divide the complete source into evenly sized slices."}
            </p>

            <div className="slice-selector">
              <span>{chopMode === "intelligent" ? "Maximum chops" : "Slices"}</span>
              <div className="slice-buttons">
                {sliceOptions.map((count) => (
                  <button key={count} className={sliceCount === count ? "active" : ""} onClick={() => setSliceCount(count)}>{count}</button>
                ))}
              </div>
              <button className="primary chop-action" disabled={busy || !sourceFile} onClick={generateChops}>CHOP</button>
            </div>

            {chops.length > 0 && (
              <div className="chop-results">
                {chops.map((slice, index) => (
                  <article className="chop-card" key={`${slice.name}-${index}`}>
                    <div><strong>{slice.name || `A${String(index + 1).padStart(2, "0")}`}</strong><span>{secondsLabel(slice.start)} → {secondsLabel(slice.end)} · {Number(slice.duration || 0).toFixed(2)}s</span></div>
                    {slice.src && <audio controls preload="none" src={slice.src} />}
                  </article>
                ))}
                {chopZip && <a className="download download-all" href={chopZip} download={`maix-chops-${Date.now()}.zip`}>Download all chops (.zip)</a>}
              </div>
            )}
          </div>
        )}

        {status && <p className="status">{status}</p>}
      </section>
    </main>
  );
}
