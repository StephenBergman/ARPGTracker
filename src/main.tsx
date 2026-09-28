import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { SnapOverlay } from "./components/SnapOverlay/SnapOverlay";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  new URLSearchParams(window.location.search).has("snap-overlay") ? <SnapOverlay /> : <App />,
);
