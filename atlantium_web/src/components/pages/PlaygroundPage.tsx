import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Send,
  ImageIcon,
  MessageSquare,
  Music,
  Video,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  Trash2,
  Download,
  X,
} from "lucide-react";

type ModelCategory = "chat" | "image" | "audio" | "video";

interface Model {
  id: string;
  name: string;
  provider: string;
  category: ModelCategory;
  description: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GeneratedMedia {
  url: string;
  type: "image" | "audio" | "video";
  prompt: string;
}

const MODELS: Model[] = [
  // Chat / LLM
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", category: "chat", description: "Latest GPT-4o model" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", category: "chat", description: "Fast & intelligent" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "Anthropic", category: "chat", description: "Most capable model" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", category: "chat", description: "Fast multimodal model" },
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", category: "chat", description: "Open-source powerhouse" },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", category: "chat", description: "Reasoning model" },
  // Image
  { id: "dall-e-3", name: "DALL-E 3", provider: "OpenAI", category: "image", description: "Text-to-image generation" },
  { id: "stable-diffusion-xl", name: "Stable Diffusion XL", provider: "Stability AI", category: "image", description: "High-quality image generation" },
  { id: "flux-1.1-pro", name: "FLUX 1.1 Pro", provider: "Black Forest Labs", category: "image", description: "Fast, high-quality images" },
  // Audio
  { id: "whisper-large-v3", name: "Whisper Large v3", provider: "OpenAI", category: "audio", description: "Speech-to-text transcription" },
  { id: "elevenlabs-v2", name: "ElevenLabs v2", provider: "ElevenLabs", category: "audio", description: "Text-to-speech synthesis" },
  // Video
  { id: "runway-gen3", name: "Runway Gen-3", provider: "Runway", category: "video", description: "Text & image to video" },
  { id: "sora", name: "Sora", provider: "OpenAI", category: "video", description: "Text-to-video generation" },
];

const CATEGORY_META: Record<ModelCategory, { icon: React.ReactNode; label: string; color: string }> = {
  chat: { icon: <MessageSquare size={16} />, label: "Chat / LLM", color: "text-cyan-400" },
  image: { icon: <ImageIcon size={16} />, label: "Image", color: "text-purple-400" },
  audio: { icon: <Music size={16} />, label: "Audio", color: "text-amber-400" },
  video: { icon: <Video size={16} />, label: "Video", color: "text-emerald-400" },
};

export function PlaygroundPage() {
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>("chat");
  const [selectedModel, setSelectedModel] = useState<Model>(MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [input, setInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredModels = MODELS.filter((m) => m.category === selectedCategory);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When category changes, select the first model in that category
  useEffect(() => {
    const first = MODELS.find((m) => m.category === selectedCategory);
    if (first) setSelectedModel(first);
  }, [selectedCategory]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setInput("");
    setIsGenerating(true);

    if (selectedCategory === "chat") {
      const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: trimmed }];
      setChatMessages(newMessages);

      // Simulate LLM response
      await simulateTypingResponse(newMessages, trimmed);
    } else {
      // Simulate media generation
      await simulateMediaGeneration(trimmed);
    }

    setIsGenerating(false);
    inputRef.current?.focus();
  };

  const simulateTypingResponse = async (messages: ChatMessage[], _userMessage: string) => {
    const responses = [
      `That's an interesting question! As ${selectedModel.name}, I'd approach this by breaking it down into key components. Let me think through this step by step.\n\nFirst, it's important to consider the context and constraints involved. The approach would vary depending on the specific requirements and trade-offs you're willing to make.\n\nWould you like me to elaborate on any particular aspect?`,
      `Great prompt! Here's my analysis:\n\n1. **Context**: Understanding the broader picture is crucial\n2. **Approach**: I'd recommend starting with the fundamentals\n3. **Implementation**: The specifics would depend on your use case\n\nLet me know if you'd like me to dive deeper into any of these areas.`,
      `I'll do my best to help with that. Based on my training, here are some key points to consider:\n\n- The most effective approach often combines multiple strategies\n- Testing and iteration are essential for good results\n- Don't overlook edge cases in your implementation\n\nShall I provide more specific guidance?`,
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setChatMessages([...messages, assistantMsg]);

    // Simulate typing character by character
    for (let i = 0; i <= response.length; i++) {
      await new Promise((r) => setTimeout(r, 8));
      setChatMessages([...messages, { role: "assistant", content: response.slice(0, i) }]);
    }
  };

  const simulateMediaGeneration = async (prompt: string) => {
    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));

    const placeholders: Record<string, string> = {
      image: `https://placehold.co/1024x1024/1a1a2e/00d4ff?text=${encodeURIComponent(selectedModel.name)}`,
      audio: "",
      video: "",
    };

    setGeneratedMedia((prev) => [
      {
        url: placeholders[selectedCategory] || "",
        type: selectedCategory as "image" | "audio" | "video",
        prompt,
      },
      ...prev,
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    setChatMessages([]);
    setGeneratedMedia([]);
    setInput("");
    setSystemPrompt("");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top controls bar */}
      <div className="shrink-0 border-b border-border bg-card/50 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          {/* Category tabs */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(Object.keys(CATEGORY_META) as ModelCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  selectedCategory === cat
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn(selectedCategory === cat && CATEGORY_META[cat].color)}>
                  {CATEGORY_META[cat].icon}
                </span>
                <span className="hidden sm:inline">{CATEGORY_META[cat].label}</span>
              </button>
            ))}
          </div>

          {/* Model selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm"
            >
              <span className="font-medium">{selectedModel.name}</span>
              <span className="text-muted-foreground text-xs hidden sm:inline">
                {selectedModel.provider}
              </span>
              <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", modelDropdownOpen && "rotate-180")} />
            </button>

            {modelDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                {filteredModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model);
                      setModelDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between",
                      selectedModel.id === model.id && "bg-muted/30"
                    )}
                  >
                    <div>
                      <div className="text-sm font-medium">{model.name}</div>
                      <div className="text-xs text-muted-foreground">{model.description}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{model.provider}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Clear button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
            disabled={chatMessages.length === 0 && generatedMedia.length === 0}
          >
            <Trash2 size={16} className="mr-1.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {/* Scrollable middle area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full h-full">
          {selectedCategory === "chat" ? (
            <div className="px-4 py-6 h-full">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-primary/10 rounded-2xl mb-4">
                    <FlaskConical className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Playground</h3>
                  <p className="text-muted-foreground max-w-md text-sm">
                    Test and compare LLM models. Select a model above and start chatting.
                  </p>

                  {/* Quick prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg">
                    {[
                      "Explain quantum computing in simple terms",
                      "Write a Python function to sort a list",
                      "What are the latest trends in AI?",
                      "Help me brainstorm startup ideas",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setInput(prompt);
                          inputRef.current?.focus();
                        }}
                        className="text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.role === "assistant" && msg.content && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30">
                            <button
                              onClick={() => handleCopy(msg.content, i)}
                              className="p-1 rounded hover:bg-background/50 transition-colors text-muted-foreground"
                            >
                              {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {selectedModel.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isGenerating && chatMessages[chatMessages.length - 1]?.role === "user" && (
                    <div className="flex gap-3 justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 size={16} className="animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-6 h-full">
              {generatedMedia.length === 0 && !isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className={cn("p-4 rounded-2xl mb-4", "bg-primary/10")}>
                    {selectedCategory === "image" && <ImageIcon className="h-10 w-10 text-purple-400" />}
                    {selectedCategory === "audio" && <Music className="h-10 w-10 text-amber-400" />}
                    {selectedCategory === "video" && <Video className="h-10 w-10 text-emerald-400" />}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {CATEGORY_META[selectedCategory].label} Generation
                  </h3>
                  <p className="text-muted-foreground max-w-md text-sm">
                    {selectedCategory === "image" && "Describe an image and bring it to life with AI."}
                    {selectedCategory === "audio" && "Generate speech, music, or sound effects from text."}
                    {selectedCategory === "video" && "Create video clips from text descriptions."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg">
                    {selectedCategory === "image" &&
                      [
                        "A futuristic city skyline at sunset with flying cars",
                        "An astronaut playing guitar on the moon",
                        "A cozy cabin in the woods during a snowstorm",
                        "Abstract digital art with neon colors and geometric shapes",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => {
                            setInput(prompt);
                            inputRef.current?.focus();
                          }}
                          className="text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                    {selectedCategory === "audio" &&
                      [
                        "Read this text in a warm, professional tone",
                        "Generate a calm lo-fi beat",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => {
                            setInput(prompt);
                            inputRef.current?.focus();
                          }}
                          className="text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                    {selectedCategory === "video" &&
                      [
                        "A timelapse of a flower blooming in a garden",
                        "Drone footage over a futuristic city at night",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => {
                            setInput(prompt);
                            inputRef.current?.focus();
                          }}
                          className="text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isGenerating && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Generating with {selectedModel.name}...
                        </p>
                      </div>
                    </div>
                  )}
                  {generatedMedia.map((media, i) => (
                    <div key={i} className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                      <div className="p-3 border-b border-border flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">{media.prompt}</p>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleCopy(media.prompt, i + 1000)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                          >
                            {copiedIndex === i + 1000 ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          {media.url && (
                            <a
                              href={media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                            >
                              <Download size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => setGeneratedMedia((prev) => prev.filter((_, j) => j !== i))}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        {media.type === "image" && media.url && (
                          <img
                            src={media.url}
                            alt={media.prompt}
                            className="w-full max-w-lg mx-auto rounded-lg"
                          />
                        )}
                        {media.type === "audio" && (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                            Audio generation preview coming soon
                          </div>
                        )}
                        {media.type === "video" && (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                            Video generation preview coming soon
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom input - pinned */}
      <div className="shrink-0 border-t border-border bg-card/50 backdrop-blur px-4 py-2">
        {/* System prompt (chat only, empty state) */}
        {selectedCategory === "chat" && chatMessages.length === 0 && (
          <div className="max-w-3xl mx-auto w-full mb-2">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="System prompt (optional)"
              rows={1}
              className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        )}
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedCategory === "chat"
                ? `Message ${selectedModel.name}...`
                : `Describe what to generate with ${selectedModel.name}...`
            }
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-32"
            style={{ minHeight: "40px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5 pb-0.5">
          Playground is for testing only. Responses are simulated.
        </p>
      </div>
    </div>
  );
}
