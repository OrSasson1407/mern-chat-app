//
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import ChatProvider from "./context/ChatProvider";
import { BrowserRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <ChatProvider>
      <ChakraProvider>
        {/* Initialize Color Mode */}
        <ColorModeScript initialColorMode="light" />
        <App />
      </ChakraProvider>
    </ChatProvider>
  </BrowserRouter>
);

reportWebVitals();