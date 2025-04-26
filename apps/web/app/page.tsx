"use client";

import { Button } from "@repo/ui/button";

import AllUsers from "./components/AllUsers";

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      
      <Button onClick={() => alert("Button clicked")}>Click me</Button>

      <AllUsers />

    </div>
  );
}
