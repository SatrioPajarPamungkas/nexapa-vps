<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EmailVerificationController extends Controller
{
    public function verify(Request $request, $id, $hash): JsonResponse
    {
        $signature = $request->query('signature');
        
        if (!$signature) {
            \Log::debug('Verification failed: no signature');
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification link.',
            ], Response::HTTP_FORBIDDEN);
        }

        $user = User::find($id);

        if (!$user) {
            \Log::debug("Verification failed: user $id not found");
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (sha1($user->getEmailForVerification()) !== $hash) {
            \Log::debug("Verification failed: hash mismatch for user $id");
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification hash.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Validate signature manually
        $expectedSignature = hash_hmac('sha256', "{$id}|{$hash}", config('app.key'));
        
        \Log::debug("Verification attempt: id=$id, hash=$hash, signature=$signature, expected=$expectedSignature, match=" . (hash_equals($expectedSignature, $signature) ? 'yes' : 'no'));
        
        if (!hash_equals($expectedSignature, $signature)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification link.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email already verified.',
            ]);
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
        ]);
    }

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email already verified.',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent.',
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'email_verified' => $user->hasVerifiedEmail(),
            ],
        ]);
    }
}
