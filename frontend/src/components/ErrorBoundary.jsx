import React from 'react';

/**
 * CRITICAL FIX: Error Boundary Component
 * Prevents entire app from crashing when a component fails
 * Catches errors in child component tree and displays fallback UI
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by boundary:', error, errorInfo);

    // Update state with error info
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // In production, send error to monitoring service (Sentry, etc.)
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking service
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
            {/* Error Icon */}
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                {this.state.errorCount > 2
                  ? 'Multiple errors detected. Please refresh the page.'
                  : 'An unexpected error occurred.'}
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {isDevelopment && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg font-mono text-sm">
                <p className="font-bold text-red-900 mb-2">Error Details:</p>
                <p className="text-red-700 mb-2 break-words">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="cursor-pointer">
                    <summary className="text-red-700 font-semibold">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-48">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <p className="text-center text-sm text-gray-500 mt-6">
              If the problem persists, please{' '}
              <a href="mailto:support@sheetaldies.com" className="text-blue-600 hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
