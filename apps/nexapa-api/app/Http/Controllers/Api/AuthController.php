<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLog
    ) {}

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'min:8'],
            'terms_accepted' => ['accepted'],
            'remember' => ['sometimes', 'boolean'],
            'verification_destination' => [
                'sometimes',
                'string',
                'in:app,crm',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $data = $validator->validated();

        \Illuminate\Support\Facades\Log::info(
            'Registration verification destination.',
            [
                'destination' =>
                    $data['verification_destination']
                        ?? 'app',
            ]
        );
        $email = Str::lower(Str::trim($data['email']));

        $user = User::create([
            'name' => $data['name'],
            'email' => $email,
            'password' => $data['password'],
            'role' => 'user',
        ]);

        try {
            $user->notify(
                new VerifyEmailNotification(
                    $data['verification_destination']
                        ?? 'app'
                )
            );
        } catch (\Throwable $exception) {
            \Illuminate\Support\Facades\Log::warning(
                'Registration verification email failed.',
                [
                    'user_id' => $user->id,
                    'exception' => $exception::class,
                ]
            );

            // Jangan tinggalkan akun setengah jadi jika email
            // verifikasi pertama gagal dikirim.
            $user->delete();

            return response()->json([
                'success' => false,
                'message' =>
                    'Email verifikasi gagal dikirim. Periksa alamat email dan coba lagi.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        // Browser app.nexapa.app memiliki session Laravel.
        // Request server-to-server dari CRM bersifat stateless.
        if ($request->hasSession()) {
            Auth::login(
                $user,
                (bool) ($data['remember'] ?? false)
            );

            $request->session()->regenerate();
        }

        $this->audit($user, 'auth.registered', 'Akun berhasil dibuat.');

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. Please verify your email.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified' => false,
                    'role' => $user->role,
                ],
            ],
        ], Response::HTTP_CREATED);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $credentials = $validator->validated();
        $credentials['email'] = strtolower($credentials['email']);
        $remember = $credentials['remember'] ?? false;
        unset($credentials['remember']);

        $loginUser = User::query()
            ->whereRaw('LOWER(email) = LOWER(?)', [
                $credentials['email'],
            ])
            ->first();

        if ($loginUser?->is_suspended === true) {
            $this->audit($loginUser, 'auth.login_blocked', 'Login ditolak karena akun disuspend.', 'blocked');
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda sedang disuspend. Hubungi administrator.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (!Auth::attempt($credentials, $remember)) {
            return response()->json([
                'success' => false,
                'message' => 'The provided credentials are incorrect.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $request->session()->regenerate();
        $user = $request->user();

        return response()->json([
            'success' => true,
            'message' => 'Logged in.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified' => $user->hasVerifiedEmail(),
                    'role' => $user->role ?? 'user',
                    'is_admin' => (bool) ($user->is_admin ?? false),
                    'google_avatar_url' => $user->google_avatar_url,
                ],
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified' => !is_null($user->email_verified_at),
                    'role' => $user->role ?? 'user',
                    'is_admin' => (bool) ($user->is_admin ?? false),
                ],
            ],
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json([
            'success' => true,
            'message' => 'Logged out.',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $data = $validator->validated();
        $email = Str::lower(Str::trim($data['email']));
        $emailChanged = $email !== $user->email;

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->update([
            'name' => $data['name'],
            'email' => $email,
        ]);

        $this->audit(
            $user,
            'account.profile_updated',
            'Profil akun diperbarui.',
            'success',
            ['email_changed' => $emailChanged]
        );

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified' => !is_null($user->email_verified_at),
                    'role' => $user->role ?? 'user',
                    'is_admin' => (bool) ($user->is_admin ?? false),
                ],
            ],
        ]);
    }

    private function audit(
        User $user,
        string $action,
        string $title,
        string $status = 'success',
        array $metadata = []
    ): void {
        $this->activityLog->log([
            'user' => $user,
            'category' => 'authentication',
            'action' => $action,
            'title' => $title,
            'status' => $status,
            'product' => 'publisher',
            'metadata' => $metadata,
        ]);
    }
}
