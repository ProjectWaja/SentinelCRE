export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-xl bg-gray-800 flex items-center justify-center">
          <span className="text-3xl font-black text-gray-500">404</span>
        </div>
        <h2 className="text-xl font-bold text-white">Page not found</h2>
        <p className="text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <a
          href="/"
          className="inline-block px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
