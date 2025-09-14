import React, { useState, useEffect, useRef, useMemo } from "react";
import { client } from "@/src/sanity/lib/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Menu, Trash2, AlertTriangle, Search, Loader } from "lucide-react";

export default function LiveTextEditor() {
  const [articles, setArticles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const editorRef = useRef(null);

  // --- Fetch list
  useEffect(() => {
    let mounted = true;
    async function fetchArticles() {
      try {
        const result = await client.fetch(
          `*[_type == "novelContent"]|order(_updatedAt desc){_id, title, content}`
        );
        if (!mounted) return;
        setArticles(result);
        if (result.length > 0) setSelectedId((id) => id ?? result[0]._id);
      } catch (e) {
        console.error(e);
      }
    }
    fetchArticles();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Fetch selected doc
  useEffect(() => {
    let active = true;
    async function fetchContent() {
      if (!selectedId) return;
      setIsLoadingDoc(true);
      try {
        const doc = await client.getDocument(selectedId);
        if (!active) return;
        setTitle(doc?.title || "");
        setContent(doc?.content || "");
        if (editorRef.current) editorRef.current.innerHTML = doc?.content || "";
        setSaveError(null);
      } catch (e) {
        console.error("Load error", e);
        setSaveError("Failed to load document.");
      } finally {
        setIsLoadingDoc(false);
      }
    }
    fetchContent();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const saveToSanity = useMemo(
    () =>
      debounce(async (htmlContent, newTitle, docId) => {
        if (!docId) return;
        setIsSaving(true);
        setSaveError(null);
        try {
          await client
            .patch(docId)
            .set({ content: htmlContent, title: newTitle })
            .commit({ autoGenerateArrayKeys: true });
          setLastSavedAt(Date.now());
        } catch (err) {
          console.error("Save error:", err);
          setSaveError("Failed to save. Changes are kept locally — try again.");
        } finally {
          setIsSaving(false);
        }
      }, 600),
    []
  );

  const handleInput = () => {
    const html = editorRef.current.innerHTML;
    setContent(html);
    saveToSanity(html, title, selectedId);
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveToSanity(content, newTitle, selectedId);
  };

  const createNewArticle = async () => {
    setIsCreating(true);
    try {
      const doc = await client.create({
        _type: "novelContent",
        title: "Untitled",
        content: "",
      });
      setArticles((prev) => [
        { _id: doc._id, title: doc.title, content: "" },
        ...prev,
      ]);
      setSelectedId(doc._id);
      setTitle("Untitled");
      setContent("");
      if (editorRef.current) editorRef.current.innerHTML = "";
    } catch (e) {
      console.error("Create error", e);
      setSaveError("Unable to create a new scene.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id) => {
    const a = articles.find((x) => x._id === id);
    if (!a) return;
    if (!window.confirm(`Delete "${a.title || "Untitled"}"?`)) return;

    try {
      await client.delete(id);
      setArticles((prev) => prev.filter((x) => x._id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setTitle("");
        setContent("");
        if (editorRef.current) editorRef.current.innerHTML = "";
      }
    } catch (err) {
      console.error("Delete error:", err);
      setSaveError("Failed to delete.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      (a?.title || "untitled").toLowerCase().includes(q)
    );
  }, [query, articles]);

  // --- Word count
  const wordCount = useMemo(() => countWords(content), [content]);

  return (
    <div className="min-h-screen font-serif text-slate-800 selection:bg-fuchsia-200/60">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="md:h-screen md:sticky md:top-0 border-r border-slate-200/70 bg-white/70 backdrop-blur-xl"
            >
              <div className="p-4 flex flex-col gap-3">
                <button
                  onClick={createNewArticle}
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 bg-white text-slate-800 px-4 py-2 rounded-2xl border border-slate-300 shadow-sm hover:bg-slate-50 focus:outline-none disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Add scene</span>

                  {/* Saving animation */}
                  <div className="flex gap-1 ml-2">
                    <div
                      className={`${isSaving ? "dot" : ""} bg-green-500 w-2 h-2 shadow-md rounded-full`}
                    ></div>
                    <div
                      className={`${isSaving ? "dot dot-delay-2" : ""} bg-green-500 w-2 h-2 shadow-md rounded-full`}
                    ></div>
                    <div
                      className={`${isSaving ? "dot dot-dealay-1" : ""} bg-green-500 w-2 h-2 shadow-md rounded-full`}
                    ></div>
                  </div>
                </button>

                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search scenes…"
                    className="w-full rounded-xl border border-slate-200 bg-white/60 px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-2.5 opacity-60" />
                </div>

                <div className="mt-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 space-y-1">
                  {filtered.map((a) => (
                    <div
                      key={a._id}
                      className={`group flex items-center gap-2 rounded-xl px-3 py-2 border ${
                        selectedId === a._id
                          ? "border-violet-400 bg-violet-50"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedId(a._id)}
                        className="flex-1 text-left truncate text-sm"
                        title={a.title || "Untitled"}
                      >
                        {a.title || "Untitled"}
                      </button>
                      <button
                        onClick={() => handleDelete(a._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-xs text-slate-500 px-2 py-4">
                      No scenes found.
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main */}
        <main className="min-h-screen flex flex-col">
          {/* Top Bar */}
          <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/60 p-2"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="ml-auto" />
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <div className="max-w-6xl px-8 mx-auto py-4">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled scene"
                className="w-full text-center text-2xl md:text-3xl font-semibold mb-4 bg-transparent focus:border-violet-400 outline-none pb-2"
              />

              <div className="relative">
                {isLoadingDoc && (
                  <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Loader className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  </div>
                )}

                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleInput}
                  className="prose text-sm prose-slate max-w-none min-h-[50vh] bg-white/70 outline-none"
                  suppressContentEditableWarning
                ></div>

                {/* Word Counter */}
                <div className="mt-2 text-right text-xs text-slate-500">
                  {wordCount} {wordCount === 1 ? "word" : "words"}
                </div>
              </div>

              {saveError && (
                <div className="mt-3 inline-flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
                  <AlertTriangle className="h-4 w-4" /> {saveError}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

// --- Helper function for word count
function countWords(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, " ").trim();
  return text.split(/\s+/).filter(Boolean).length;
}
