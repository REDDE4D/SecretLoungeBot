'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Script from 'next/script';
import type { AuthData } from '@/types/api';
import QRCode from 'qrcode';

declare global {
  interface Window {
    onTelegramAuth?: (user: AuthData) => void;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'widget' | 'qr'>('widget');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'YourBotUsername';

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Define the callback function for Telegram widget
    window.onTelegramAuth = async (user: AuthData) => {
      setIsLoggingIn(true);
      setError(null);

      try {
        await login(user);
        router.push('/dashboard');
      } catch (err) {
        console.error('Login failed:', err);
        setError('Authentication failed. Please try again or contact administrator.');
      } finally {
        setIsLoggingIn(false);
      }
    };

    return () => {
      delete window.onTelegramAuth;
    };
  }, [login, router]);

  useEffect(() => {
    // Dynamically create Telegram login button after script loads
    const timer = setTimeout(() => {
      const container = document.getElementById('telegram-login-container');
      if (container && typeof window !== 'undefined' && botUsername) {
        // Clear existing content
        container.innerHTML = '';

        // Create script element
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-lang', 'en'); // Force English language
        script.async = true;

        container.appendChild(script);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [botUsername]);

  // Generate QR code when QR login method is selected
  useEffect(() => {
    if (loginMethod === 'qr' && canvasRef.current) {
      let pollInterval: NodeJS.Timeout;

      const setupQRLogin = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

          // Create login token on the server
          const createResponse = await fetch(`${apiUrl}/auth/create-login-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!createResponse.ok) {
            throw new Error('Failed to create login token');
          }

          const { data } = await createResponse.json();
          const token = data.token;

          // Create Telegram bot deep link with start parameter
          const botLink = `https://t.me/${botUsername}?start=login_${token}`;
          setQrCodeUrl(botLink);

          // Generate QR code on canvas
          if (canvasRef.current) {
            await QRCode.toCanvas(canvasRef.current, botLink, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            });
          }

          // Start polling for authentication status
          pollInterval = setInterval(async () => {
            try {
              const response = await fetch(`${apiUrl}/auth/check-login-token/${token}`);

              if (response.ok) {
                const checkData = await response.json();
                if (checkData.success && checkData.data?.authenticated) {
                  clearInterval(pollInterval);

                  // Complete login using the token
                  const loginResponse = await fetch(`${apiUrl}/auth/login-with-token`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: checkData.data.token }),
                  });

                  if (loginResponse.ok) {
                    const loginData = await loginResponse.json();
                    if (loginData.success && loginData.data) {
                      // Store tokens and user data
                      const { user, accessToken, refreshToken } = loginData.data;

                      // Import apiClient to set tokens
                      const { apiClient } = await import('@/lib/api');
                      apiClient.setTokens(accessToken, refreshToken);

                      router.push('/dashboard');
                    }
                  } else {
                    throw new Error('Failed to complete login');
                  }
                }
              }
            } catch (err) {
              console.error('Error checking login status:', err);
              setError('Login failed. Please try again.');
              clearInterval(pollInterval);
            }
          }, 2000); // Poll every 2 seconds
        } catch (err) {
          console.error('Failed to setup QR login:', err);
          setError('Failed to generate QR code. Please try widget login.');
        }
      };

      setupQRLogin();

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [loginMethod, botUsername, login, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-bg">
        <div className="text-center space-y-4 animate-in">
          <div className="mb-4 text-6xl animate-pulse">🔄</div>
          <p className="text-lg text-gradient font-semibold">Loading...</p>
          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-widget.js?22" strategy="lazyOnload" />

      <div className="flex min-h-screen items-center justify-center gradient-bg relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-vibrant/20 blur-3xl animate-pulse [animation-delay:1s]"></div>
        </div>

        <div className="relative w-full max-w-md space-y-8 rounded-3xl glass-strong p-10 shadow-glow-accent animate-in">
          <div className="text-center space-y-4">
            <div className="mb-4 text-7xl animate-bounce [animation-duration:2s]">🤖</div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient">
              TG-Lobby-Bot
            </h1>
            <p className="text-base text-muted-foreground">
              Admin dashboard for managing your Telegram lobby bot
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 p-4 border border-red-500/30 animate-in">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm font-medium bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent dark:from-red-400 dark:to-pink-400">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLoggingIn ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4 animate-in">
                  <div className="mb-2 text-6xl animate-pulse">⏳</div>
                  <p className="text-lg text-gradient font-semibold">Authenticating...</p>
                  <div className="flex justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <p className="text-base text-muted-foreground font-medium">
                  Sign in with your Telegram account
                </p>

                {/* Login method toggle */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl backdrop-blur-sm">
                  <button
                    onClick={() => setLoginMethod('widget')}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      loginMethod === 'widget'
                        ? 'bg-gradient-to-r from-primary to-accent-vibrant text-primary-foreground shadow-glow scale-105'
                        : 'text-muted-foreground hover:text-foreground hover:scale-105'
                    }`}
                  >
                    Phone Login
                  </button>
                  <button
                    onClick={() => setLoginMethod('qr')}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      loginMethod === 'qr'
                        ? 'bg-gradient-to-r from-primary to-accent-vibrant text-primary-foreground shadow-glow scale-105'
                        : 'text-muted-foreground hover:text-foreground hover:scale-105'
                    }`}
                  >
                    QR Code
                  </button>
                </div>

                {/* Widget Login */}
                {loginMethod === 'widget' && (
                  <div id="telegram-login-container" className="flex justify-center min-h-[50px] animate-in">
                    {/* Telegram widget will be injected here */}
                  </div>
                )}

                {/* QR Code Login */}
                {loginMethod === 'qr' && (
                  <div className="flex flex-col items-center space-y-4 animate-in">
                    <div className="bg-white p-5 rounded-2xl shadow-glow-accent border-2 border-primary/20">
                      <canvas ref={canvasRef} className="block rounded-lg" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-base mb-2">Scan with Telegram</p>
                      <p className="text-sm text-muted-foreground">Open the camera in Telegram and scan this QR code</p>
                    </div>
                    <a
                      href={qrCodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:text-accent-vibrant transition-colors duration-300 hover:scale-105 inline-block"
                    >
                      Or click here to open in Telegram →
                    </a>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground space-y-2 pt-4 border-t border-border/50">
                  <p className="font-medium">🔒 Only authorized administrators can access this dashboard</p>
                  <p className="text-xs">
                    If you don&apos;t have access, please contact your bot administrator
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-border/50 pt-6">
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p className="font-medium">🔐 Powered by Telegram Login</p>
              <p>Your data is securely transmitted and encrypted</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
