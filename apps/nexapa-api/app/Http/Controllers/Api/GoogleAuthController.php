<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class GoogleAuthController extends Controller
{
    public function redirect()
    {
        if (!config('services.google.client_id') || !config('services.google.client_secret')) {
            $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'https://app.nexapa.me');
            return redirect($frontendUrl . '/login?google_error=not_configured');
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request)
    {
        $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'https://app.nexapa.me');

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            Log::error('Google OAuth Socialite callback failed', [
                'exception_class' => get_class($e),
                'exception_message' => $e->getMessage(),
                'has_code' => $request->has('code'),
                'has_state' => $request->has('state'),
            ]);

            return redirect($frontendUrl . '/login?google_error=authentication_failed');
        }

        if (!$googleUser->getEmail()) {
            return redirect($frontendUrl . '/login?google_error=email_unavailable');
        }

        $rawGoogleUser = $googleUser->getRaw();
        $emailVerified = filter_var(
            $rawGoogleUser['email_verified']
                ?? $rawGoogleUser['verified_email']
                ?? false,
            FILTER_VALIDATE_BOOLEAN
        );

        if (!$emailVerified) {
            return redirect($frontendUrl . '/login?google_error=email_not_verified');
        }

        $email = Str::lower(Str::trim($googleUser->getEmail()));
        $googleId = $googleUser->getId();
        $avatar = $googleUser->getAvatar();
        $name = $googleUser->getName();

        try {
            $user = DB::transaction(function () use ($googleId, $email, $name, $avatar, $frontendUrl) {
                $existingByGoogleId = User::where('google_id', $googleId)->first();

                if ($existingByGoogleId) {
                    $this->performLogin($existingByGoogleId);
                    return $existingByGoogleId;
                }

                $existingByEmail = User::where('email', $email)->first();

                if ($existingByEmail) {
                    if ($existingByEmail->google_id && $existingByEmail->google_id !== $googleId) {
                        throw new \Exception('account_conflict');
                    }

                    $existingByEmail->update([
                        'google_id' => $googleId,
                        'google_avatar_url' => $avatar,
                        'email_verified_at' => now(),
                    ]);

                    $this->performLogin($existingByEmail);
                    return $existingByEmail;
                }

                $randomPassword = Hash::make(Str::random(32));

                $user = User::create([
                    'name' => $name ?? $email,
                    'email' => $email,
                    'password' => $randomPassword,
                    'role' => 'user',
                    'google_id' => $googleId,
                    'google_avatar_url' => $avatar,
                    'email_verified_at' => now(),
                ]);

                event(new Registered($user));

                $this->performLogin($user);
                return $user;
            });

            return redirect($frontendUrl . '/auth/google/callback?status=success');
        } catch (\Exception $e) {
            $errorCode = $e->getMessage();

            Log::error('Google OAuth account login failed', [
                'exception_class' => get_class($e),
                'exception_message' => $e->getMessage(),
                'google_user_email' => $email ?? null,
                'has_google_id' => isset($googleId),
            ]);

            if (in_array($errorCode, ['account_conflict', 'email_unavailable', 'email_not_verified'])) {
                return redirect($frontendUrl . '/login?google_error=' . $errorCode);
            }

            return redirect($frontendUrl . '/login?google_error=authentication_failed');
        }
    }

    private function performLogin(User $user): void
    {
        Auth::login($user);
        request()->session()->regenerate();
    }
}
