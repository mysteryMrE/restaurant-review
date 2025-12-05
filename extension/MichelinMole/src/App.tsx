import { useCallback, useEffect, useState } from "react";
import "./index.css";
import axios from "axios";
import Chat from "./Chat";

const backendUrl = "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL: backendUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [localApiKey, setLocalApiKey] = useState<string>("");

  const [dataId, setDataId] = useState<string | null>(null);

  const [name, setName] = useState<string>("");

  const initChat = async () => {
    const dataId = await getUrl();
    if (!dataId || !apiKey) {
      setDataId(null);
      return;
    }
    try {
      const response = await axiosInstance.post(`/reviews/${dataId}`, {
        api_key: apiKey,
        target_reviews: 45,
      });
      setDataId(response.data.data_id);
      setName(response.data.name);
    } catch (error) {
      console.error("Error initializing chat:", error);
      alert("Failed to initialize chat.");
      setDataId(null);
      setName("");
    }
  };

  const getUrl = async () => {
    try {
      let [tab] = await chrome.tabs.query({ active: true });

      if (!tab.url) {
        alert("Could not retrieve the current tab URL.");
        console.log("Tab URL is undefined");
        return;
      }

      const url = tab.url;
      const googleMapsPrefix = "https://www.google.com/maps/";
      if (!url.startsWith(googleMapsPrefix)) {
        alert("This extension only works on Google Maps pages.");
        return;
      }

      const match = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
      const dataId = match ? match[1] : null;
      if (!dataId) {
        alert("Could not extract data ID from URL");
        return;
      }
      return dataId;
    } catch (error) {
      console.error("Error getting URL:", error);
    }
  };

  const getApiKey = useCallback(async () => {
    const result = await chrome.storage.local.get("api_key");
    console.log("Retrieved API Key from storage:", result);
    return (result.api_key as string | null) || null;
  }, []);

  useEffect(() => {
    const fetchApiKey = async () => {
      const potApiKey = await getApiKey();
      console.log("Retrieved API Key:", potApiKey);
      setApiKey(potApiKey);
    };
    fetchApiKey();
  }, [getApiKey]);

  const setApiKeyStorage = async () => {
    const key = localApiKey.trim();
    await chrome.storage.local.set({ api_key: key });
    setApiKey(key);
  };
  const deleteApiKey = async () => {
    await chrome.storage.local.remove("api_key");
    setApiKey(null);
    setLocalApiKey("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyStorage();
  };

  return (
    <div className="flex flex-col gap-3 p-4 items-center">
      <img
        className="h-40 w-40 object-cover"
        src="icons/32.png"
        alt="Mole in a pot"
        width={100}
      />
      {apiKey ? (
        <>
          <button className="btn" onClick={deleteApiKey}>
            Delete API Key
          </button>
        </>
      ) : (
        <form
          className="flex flex-col gap-2 relative mb-3"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            className="p-2 ring-1 ring-gray-400 rounded w-full focus:outline-none focus:ring-blue-500 focus:ring-2"
            placeholder="Api Key"
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
          />
          <button className="btn" type="submit">
            Save API Key
          </button>
        </form>
      )}
      {apiKey && (
        <button className="btn" onClick={initChat}>
          Start new chat
        </button>
      )}
      {
        <Chat
          key={dataId}
          dataId={dataId || ""}
          name={name || ""}
          axios={axiosInstance}
        />
      }
    </div>
  );
}

export default App;
