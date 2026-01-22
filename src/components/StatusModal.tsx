import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'success' | 'error';
  title: string;
  message: string;
  details?: {
    amount?: number;
    to?: string;
    category?: string;
    date?: string;
    account?: string;
    newBalance?: number;
  };
  onViewDetails?: () => void;
  onTryAgain?: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  status,
  title,
  message,
  details,
  onViewDetails,
  onTryAgain
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700">
        {/* Header with Icon */}
        <div className={`relative pt-12 pb-8 ${status === 'success' ? 'bg-gradient-to-b from-green-900/30 to-transparent' : 'bg-gradient-to-b from-red-900/30 to-transparent'}`}>
          <div className="flex justify-center mb-4">
            <div className={`rounded-full p-4 ${status === 'success' ? 'bg-green-600/20 ring-4 ring-green-600/30' : 'bg-red-600/20 ring-4 ring-red-600/30'}`}>
              {status === 'success' ? (
                <CheckCircle className="w-12 h-12 text-green-400" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400" />
              )}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {title}
          </h2>
          <p className="text-center text-slate-300 px-6">
            {message}
          </p>
        </div>

        {/* Details Section */}
        {details && (
          <div className="px-6 py-6 space-y-4 bg-slate-800/50">
            {details.amount !== undefined && (
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Amount {status === 'success' ? 'Sent' : 'Attempted'}</p>
                <p className="text-3xl font-bold text-white">RM {details.amount.toFixed(2)}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {details.to && (
                <div>
                  <p className="text-slate-400 mb-1">TO</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <span className="text-lg">☕</span>
                    {details.to}
                  </p>
                </div>
              )}

              {details.category && (
                <div>
                  <p className="text-slate-400 mb-1">CATEGORY</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <span className="text-lg">🍔</span>
                    {details.category}
                  </p>
                </div>
              )}

              {details.date && (
                <div>
                  <p className="text-slate-400 mb-1">DATE</p>
                  <p className="text-white font-medium">{details.date}</p>
                </div>
              )}

              {details.account && (
                <div>
                  <p className="text-slate-400 mb-1">ACCOUNT</p>
                  <p className="text-white font-medium">{details.account}</p>
                </div>
              )}
            </div>

            {details.newBalance !== undefined && status === 'success' && (
              <div className="mt-4 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                <div className="flex items-center gap-2 text-blue-400">
                  <span className="text-lg">ℹ️</span>
                  <div>
                    <p className="text-xs">New balance:</p>
                    <p className="font-bold">RM {details.newBalance.toFixed(2)} <span className="text-xs font-normal">This will be reflected in your dashboard immediately.</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 flex gap-3">
          {status === 'success' ? (
            <>
              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
                >
                  View Details
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all shadow-lg"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
              >
                Close
              </button>
              {onTryAgain && (
                <button
                  onClick={onTryAgain}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all shadow-lg"
                >
                  Try Again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusModal;
