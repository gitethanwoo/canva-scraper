'use client';

import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const description = searchParams.get('description');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-red-900">
              Connection Error
            </h2>
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-medium text-red-600">
                {error}
              </p>
              {description && (
                <p className="mt-1 text-gray-500">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={() => window.close()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 