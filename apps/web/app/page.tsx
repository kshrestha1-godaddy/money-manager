"use client";

import { Button } from "@repo/ui/button";

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      
      <Button onClick={() => alert("Button clicked")}>Click me</Button>

    </div>
  );
}
