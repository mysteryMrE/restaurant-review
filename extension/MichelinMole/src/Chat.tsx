import { useEffect, useRef, useState } from "react";
import { type AxiosInstance } from "axios";
import { Send } from "lucide-react";
import { ThreeDot } from "react-loading-indicators";

const Chat = ({
  name,
  axios,
  dataId,
}: {
  name: string;
  axios: AxiosInstance;
  dataId: string;
}) => {
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [input, setInput] = useState<string>("");
  const waiting = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputTemp = input.trim();
    if (waiting.current || inputTemp === "") return;
    console.log("Sending message:", inputTemp);
    const userMessage = { role: "user", content: inputTemp };
    setMessages((prev) => [...prev, userMessage]);
    waiting.current = true;
    setInput("");
    try {
      const response = await axios.post(`/question/${dataId}`, {
        question: inputTemp,
      });
      const botReply = response.data;
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: botReply.answer },
      ]);
      console.log("Received response:", botReply);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      waiting.current = false;
    }
  };
  if (!name) {
    return <div></div>;
  }

  return (
    <div className="w-full flex flex-col items-center gap-3 p-2">
      <h2 className="text-lg font-bold mb-2 text-center">
        {name.slice(0, 34) + (name.length > 34 ? "..." : "")}
      </h2>
      <div className="w-full max-w-[300px] min-w-[280px] flex flex-col items-center ring-1 ring-gray-400 rounded p-2">
        <div className="max-h-[40vh] overflow-y-auto flex flex-col w-full gap-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded-md max-w-[80%] break-words overflow-wrap-anywhere ${
                msg.role === "user"
                  ? "bg-blue-200 self-end"
                  : "bg-gray-200 self-start"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {waiting.current && <ThreeDot color={"#9da3aeff"} size="small" />}
          <div ref={messagesEndRef} />
        </div>
        <form
          className="w-full ring-1 ring-gray-400 rounded-full p-1 inline-flex items-center mt-2"
          onSubmit={sendMessage}
        >
          <input
            type="text"
            value={input}
            className="p-1 ml-2 flex-grow outline-none"
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className={`rounded-full bg-blue-500 text-white px-2 py-1 pr-3 ${
              !waiting.current
                ? "cursor-pointer hover:bg-blue-700"
                : "cursor-not-allowed hover:bg-blue-500"
            }`}
            type="submit"
            disabled={waiting.current}
          >
            <Send size={20} color="#ffffff" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
