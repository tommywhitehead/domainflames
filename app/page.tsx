import SearchBar from "@/components/search-bar";

export default function Home() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-4">Find your domain</h1>
        <p className="text-muted-foreground mb-6">Search availability, pricing, WHOIS, and alternatives.</p>
      </div>
      <div className="mx-auto max-w-2xl">
        <SearchBar />
      </div>
    </main>
  );
}
