import React from 'react';
import mwdLogo from '../../assets/mwdlogo.png';

const PageLoader = ({ loadingMessage = "Loading..." }) => {
    return (
        <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center z-[100]">
            <img 
                src={mwdLogo} 
                alt="MWD Logo" 
                className="h-28 w-28 object-contain animate-pulse mb-6 drop-shadow-md" 
            />
            <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-5 text-blue-900 font-semibold tracking-wide text-lg">{loadingMessage}</p>
        </div>
    );
};

export default PageLoader;