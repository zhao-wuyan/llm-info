import Link from "next/link";
export default function NotFound() { return <main className="standalone-state"><h1>404</h1><p>The requested catalog entry was not found.</p><Link className="primary-button" href="/models">Back to models</Link></main>; }
