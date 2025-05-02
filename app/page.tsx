
export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">Bienvenue sur Planify</h1>
      <div className="flex gap-4 mt-8">
        <a 
          href="/login" 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Sign in
        </a>
        <a 
          href="/register" 
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Sign up
        </a>
      </div>
    </div>
  );
}