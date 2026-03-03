export default function Home() {
  return (
    <div className="container">
      <main>
        <h1>AI Prompt App</h1>
        <textarea
          placeholder="Enter your prompt here..."
          rows={5}
        />
        <button>Submit</button>
      </main>
    </div>
  );
}
