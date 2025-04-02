export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Successfully Connected!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your Zoom account has been successfully connected. You can close this window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 