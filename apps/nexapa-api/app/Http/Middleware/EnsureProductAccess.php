<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProductAccess
{
    public function handle(
        Request $request,
        Closure $next,
        string $product,
    ): Response {
        $user = $request->user();

        if ($user === null || $user->is_admin === true) {
            return $next($request);
        }

        if ($user->is_suspended === true) {
            return $this->denied(
                'account_suspended',
                'Akun Anda sedang disuspend secara global.',
            );
        }

        $field = match ($product) {
            'publisher' => 'publisher_access_status',
            'crm' => 'crm_access_status',
            'commerce' => 'commerce_access_status',
            default => null,
        };

        if ($field === null) {
            return $this->denied(
                'product_access_invalid',
                'Produk yang diminta tidak valid.',
            );
        }

        if (($user->{$field} ?? 'active') !== 'active') {
            return $this->denied(
                $product.'_access_suspended',
                match ($product) {
                    'publisher' =>
                        'Akses Publisher sedang dinonaktifkan.',
                    'crm' =>
                        'Akses CRM sedang dinonaktifkan.',
                    'commerce' =>
                        'Akses Commerce sedang dinonaktifkan.',
                },
            );
        }

        return $next($request);
    }

    private function denied(
        string $code,
        string $message,
    ): Response {
        return response()->json([
            'success' => false,
            'code' => $code,
            'message' => $message,
        ], Response::HTTP_FORBIDDEN);
    }
}
