"use client";

import { LinkComponent } from "./components/LinkComponent";
import { Button } from "@repo/ui/button";


export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-green-400">
      <h1>Hello World from web</h1>

      <LinkComponent />

      <Button onClick={() => alert("Button clicked")}>Click me</Button>

    </div>
  );
}
