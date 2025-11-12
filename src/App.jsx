import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth as fbAuth, db as fbDb } from './firebase/firebaseConfig';
import { userProfileDocumentPath, systemSettingsDocumentPath, profilesCollectionPath } from './firebase/firestorePaths.js';
import * as AuthService from './services/authService.js';
import { createUserProfile, getUserProfile } from './services/dataService.js';
import { determineServiceTypeAndRole } from './utils/userUtils.js';

import { Notification } from './components/ui/Notifications.jsx';
import PageLoader from './components/ui/PageLoader.jsx';
import AuthFormContainer from './components/auth/AuthContainerForm.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import SignupForm from './components/auth/SignupForm.jsx';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm.jsx';
import PasswordlessLoginForm from './components/auth/PasswordlessLoginForm.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import { HardHat, LogOut as LogoutIcon, AlertTriangle } from 'lucide-react';
import './index.css';

const MaintenancePage = () => (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4 text-center">
        <HardHat size={64} className="text-yellow-400 mb-4 animate-bounce" />
        <h1 className="text-4xl font-bold mb-2">Under Maintenance</h1>
        <p className="text-gray-400">The AGWA portal is currently undergoing maintenance.</p>
        <p className="text-gray-400">We expect to be back online shortly.</p>
    </div>
);

const ErrorDisplay = ({ error, onLogout }) => (
     <div className="min-h-screen bg-red-50 flex flex-col justify-center items-center p-4 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-700 mb-2">Application Error</h1>
        <p className="text-gray-700 mb-4 max-w-md">
           An error occurred while loading your data:
        </p>
         <p className="text-sm text-red-600 bg-red-100 p-3 rounded mb-4 max-w-xl text-left font-mono break-words">{error}</p>
        <p className="text-gray-600 mb-4">Please try refreshing the page. If the problem persists, contact support.</p>
         {onLogout && (
             <button
                 onClick={onLogout}
                 className="mt-4 flex items-center justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow"
             >
                 <LogoutIcon size={16} className="mr-2" />
                 Logout and Try Again
             </button>
         )}
    </div>
);

const App = () => {
    const [appState, setAppState] = useState('initializing');
    const [authUser, setAuthUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [appError, setAppError] = useState(null);
    const [systemSettings, setSystemSettings] = useState(null);
    const [settingsError, setSettingsError] = useState(null);
    const [authActionLoading, setAuthActionLoading] = useState(false);
    const [formSpecificError, setFormSpecificError] = useState('');
    const [currentPage, setCurrentPage] = useState('login');
    const [notification, setNotification] = useState({ message: '', type: '' });

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    }, []);

    const clearNotification = useCallback(() => setNotification({ message: '', type: '' }), []);

    useEffect(() => {
        const settingsRef = doc(fbDb, systemSettingsDocumentPath());
        const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
            setSystemSettings(docSnap.exists() ? docSnap.data() : { maintenanceMode: false });
            setSettingsError(null);
        }, (error) => {
            console.error("Critical Error: Failed to fetch system settings:", error);
            setSettingsError(`Failed to load config: ${error.message}. Maintenance mode assumed off.`);
            setSystemSettings({ maintenanceMode: false });
        });

        let unsubscribeProfile = () => {};

        const unsubscribeAuth = onAuthStateChanged(fbAuth, async (user) => {
            unsubscribeProfile();
            setAppError(null);
            setUserProfile(null);
            setAuthUser(user);

            if (user) {
                setAppState('loading_profile');
                
                const profileRef = doc(fbDb, profilesCollectionPath(), user.uid);

                unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile({ id: docSnap.id, ...docSnap.data() });
                        setAppState('app_ready');
                    } else {
                        try {
                            const nestedProfileResult = await getDoc(doc(fbDb, userProfileDocumentPath(user.uid)));
                            if (nestedProfileResult.exists()) {
                                setUserProfile({ id: nestedProfileResult.id, ...nestedProfileResult.data() });
                                setAppState('app_ready');
                                return;
                            }

                            const isEmailPasswordSignup = user.providerData.some(p => p.providerId === 'password');
                            let profileData;

                            if (isEmailPasswordSignup) {
                                const displayName = localStorage.getItem('signupDisplayName') || user.email || 'New User';
                                const accountNumber = localStorage.getItem('signupAccountNumber') || '';
                                localStorage.removeItem('signupDisplayName');
                                localStorage.removeItem('signupAccountNumber');
                                
                                const { role, serviceType } = determineServiceTypeAndRole(accountNumber);
                                profileData = { 
                                    email: user.email || '', 
                                    phoneNumber: user.phoneNumber || '', 
                                    displayName, 
                                    accountNumber, 
                                    role, 
                                    serviceType, 
                                    accountStatus: 'Active', 
                                    photoURL: user.photoURL || '' 
                                };
                            } else {
                                profileData = {
                                    email: user.email || '',
                                    phoneNumber: user.phoneNumber || '',
                                    displayName: user.displayName || user.email || 'New User',
                                    accountNumber: '',
                                    role: 'customer',
                                    serviceType: 'Residential',
                                    accountStatus: 'Active',
                                    photoURL: user.photoURL || ''
                                };
                            }

                            const creationResult = await createUserProfile(fbDb, user.uid, profileData);
                            if (!creationResult.success) {
                                throw new Error(creationResult.error || "Failed to auto-create user profile.");
                            }
                        } catch (error) {
                            console.error("Profile creation/snapshot error:", error);
                            setAppError(`Profile Error: ${error.message}`);
                            setAppState('error');
                            setUserProfile(null);
                        }
                    }
                }, (error) => {
                    console.error("Profile listener error:", error);
                    setAppError(`Profile Listener Error: ${error.message}`);
                    setAppState('error');
                    setUserProfile(null);
                });

            } else {
                 setAppState('auth_required');
                 setCurrentPage('login');
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeSettings();
            unsubscribeProfile();
        };
    }, []);

    const navigateTo = useCallback((page) => {
        setFormSpecificError('');
        setCurrentPage(page);
    }, []);

    const handleAuthAction = async (action, ...args) => {
        setAuthActionLoading(true);
        setFormSpecificError('');
        let result = { success: false, error: "An unexpected error occurred." };
        try {
            result = await action(fbAuth, ...args);
            if (!result.success && result.error) { setFormSpecificError(result.error); }
        } catch(error) {
            const formattedError = AuthService.formatAuthError(error);
            setFormSpecificError(formattedError);
            result = {success: false, error: formattedError};
        } finally {
            setAuthActionLoading(false);
        }
         return result;
    };

    const handleLogin = (email, password) => handleAuthAction(AuthService.signInWithEmail, email, password);
    const handleGoogleSignIn = () => handleAuthAction(AuthService.signInWithGoogle);
    const handleLogout = async () => {
        setAppState('initializing');
        await handleAuthAction(AuthService.logoutUserService);
    };
    const handleSignup = async (email, password, displayName, accountNumber) => {
        localStorage.setItem('signupDisplayName', displayName);
        localStorage.setItem('signupAccountNumber', accountNumber);
        await handleAuthAction(AuthService.signUpWithEmail, email, password);
    };
    const handleForgotPassword = async (email) => {
        const result = await handleAuthAction(AuthService.sendPasswordResetService, email);
        if (result.success) { showNotification(result.message || "Password reset email sent!", "success"); }
        return result.success;
    };
    const handlePasswordlessSignIn = async (email) => {
        const actionCodeSettings = { url: window.location.origin, handleCodeInApp: true };
        const result = await handleAuthAction(AuthService.sendSignInEmailLinkService, email, actionCodeSettings);
        if(result.success) showNotification(result.message || `Sign-in link sent to ${email}!`, "success");
        return result;
    };

    useEffect(() => {
        const handleSignInLink = async () => {
            if (!fbAuth) return;
            const href = window.location.href;
            if (AuthService.isSignInWithEmailLink(fbAuth, href)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) email = window.prompt('Confirm your email for sign-in:');
                if (email) {
                    setAppState('initializing');
                    await handleAuthAction(AuthService.handleSignInWithEmailLink, email, href);
                    window.history.replaceState(null, '', window.location.origin);
                } else {
                     showNotification("Email required for link sign-in.", "error");
                     window.history.replaceState(null, '', window.location.origin);
                     setAppState('auth_required');
                }
            }
        };
        handleSignInLink();
    }, [handleAuthAction, showNotification]);


    if (appState === 'initializing' || appState === 'loading_profile') {
        const message = appState === 'initializing' ? "Initializing Session..." : "Loading Profile...";
        return <PageLoader loadingMessage={message} />;
    }

    if (appState === 'error') {
         return <ErrorDisplay error={appError || settingsError || "Unknown application error."} onLogout={handleLogout} />;
    }

    if (appState === 'app_ready' && authUser && userProfile) {
        if (systemSettings?.maintenanceMode && userProfile?.role !== 'admin') {
            return <MaintenancePage />;
        }
        return (
            <>
                <DashboardLayout
                    user={authUser}
                    userData={userProfile}
                    setUserData={setUserProfile}
                    handleLogout={handleLogout}
                    showNotification={showNotification}
                    auth={fbAuth}
                    db={fbDb}
                />
                <Notification message={notification.message} type={notification.type} onClose={clearNotification} />
            </>
        );
    }

    if (appState === 'auth_required') {
        const effectiveSystemSettings = systemSettings || { maintenanceMode: false };
         const authPages = {
            login: <LoginForm handleLoginExternal={handleLogin} handleGoogleSignIn={handleGoogleSignIn} navigateTo={navigateTo} authActionLoading={authActionLoading} setAuthError={setFormSpecificError} systemSettings={effectiveSystemSettings}/>,
            signup: <SignupForm handleSignupExternal={handleSignup} handleGoogleSignIn={handleGoogleSignIn} navigateTo={navigateTo} authActionLoading={authActionLoading} setAuthError={setFormSpecificError} showNotification={showNotification} systemSettings={effectiveSystemSettings}/>,
            forgotPassword: <ForgotPasswordForm handleForgotPasswordExternal={handleForgotPassword} navigateTo={navigateTo} authActionLoading={authActionLoading} />,
            passwordlessLogin: <PasswordlessLoginForm handlePasswordlessSignInExternal={handlePasswordlessSignIn} navigateTo={navigateTo} authActionLoading={authActionLoading} />,
        };
        return (
            <>
                <AuthFormContainer authError={formSpecificError || settingsError} systemSettings={effectiveSystemSettings}>
                    {authPages[currentPage] || authPages.login}
                </AuthFormContainer>
                <Notification message={notification.message} type={notification.type} onClose={clearNotification} />
            </>
        );
    }

     return <PageLoader loadingMessage="Unexpected Application State" />;
};

export default App;