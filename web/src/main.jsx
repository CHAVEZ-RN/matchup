import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import BookPage from "./BookPage.jsx";

function useRoute() {
  const parse = () => {
    const hash = window.location.hash || "";
    const path = window.location.pathname || "/";
    if (hash.startsWith("#/book/")) return { name: "book", slug: hash.slice(7).split(/[?#]/)[0] };
    if (path.startsWith("/book/"))  return { name: "book", slug: path.slice(6).split(/[?#]/)[0] };
    return { name: "dashboard" };
  };
  const [r, setR] = useState(parse);
  useEffect(() => {
    const onChange = () => setR(parse());
    window.addEventListener("hashchange", onChange);
    window.addEventListener("popstate", onChange);
    return () => { window.removeEventListener("hashchange", onChange); window.removeEventListener("popstate", onChange); };
  }, []);
  return r;
}
function Root() {
  const r = useRoute();
  if (r.name === "book") return <BookPage slug={decodeURIComponent(r.slug || "")} />;
  return <App />;
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
