import React, { useEffect, useState } from "react";

const NO_VOICE = "no-voice";

export default function App() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [targetLang, setTargetLang] = useState("es");
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(NO_VOICE);
  const [error, setError] = useState(null);
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (voices.length > 0 && selectedVoiceURI === NO_VOICE) {
      setSelectedVoiceURI(voices[0].voiceURI);
    }
  }, [voices]);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      setError("Speech recognition not supported in this browser");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setFinalText((prev) => prev + finalTranscript);
      setInterim(interimTranscript);
    };
    recognition.onerror = (e) => setError(e.error);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const composeRecognizedText = () => (finalText + " " + interim).trim();

  const doTranslateAndSpeak = async () => {
    const text = composeRecognizedText();
    if (!text) {
      setError("No text to translate yet.");
      return;
    }
    try {
      const res = await fetch("https://libretranslate.com/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "en", target: targetLang, format: "text" }),
      });
      const data = await res.json();
      if (!data.translatedText) throw new Error("Translation failed");
      setTranslation(data.translatedText);
      if (selectedVoiceURI !== NO_VOICE) {
        const utterance = new SpeechSynthesisUtterance(data.translatedText);
        const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;
        speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Live Voice Translator</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={startListening} disabled={listening}>
        {listening ? "Listening..." : "Start Listening"}
      </button>
      <div style={{ marginTop: "10px" }}>
        <strong>Recognized:</strong>
        <p>{composeRecognizedText() || "(nothing yet)"}</p>
      </div>
      <div>
        <label>Target Language: </label>
        <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="hi">Hindi</option>
          <option value="zh">Chinese</option>
        </select>
      </div>
      <div>
        <label>Voice: </label>
        <select value={selectedVoiceURI} onChange={(e) => setSelectedVoiceURI(e.target.value)}>
          {voices.length === 0 && <option value={NO_VOICE}>No voices available</option>}
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
          ))}
        </select>
      </div>
      <button onClick={doTranslateAndSpeak} disabled={!composeRecognizedText()} style={{ marginTop: "10px" }}>
        Translate & Speak
      </button>
      {translation && (
        <div style={{ marginTop: "20px" }}>
          <strong>Translation:</strong>
          <p>{translation}</p>
        </div>
      )}
    </div>
  );
}
