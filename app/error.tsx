"use client";

import { AlertCircle } from "lucide-react";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <main className="standalone-state"><AlertCircle size={28} /><h1>Page failed to load</h1><button className="primary-button" onClick={reset}>Retry</button></main>; }
