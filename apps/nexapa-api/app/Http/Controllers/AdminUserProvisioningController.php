<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AdminUserProvisioningController extends Controller
{
    public function create(): RedirectResponse
    {
        return $this->redirectToSeparatedPanel();
    }

    public function store(Request $request): RedirectResponse
    {
        return $this->redirectToSeparatedPanel();
    }

    private function redirectToSeparatedPanel(): RedirectResponse
    {
        return redirect('/admin/all-users')->with(
            'error',
            'Pembuatan akun gabungan dinonaktifkan. Gunakan menu User Publisher, User CRM, atau User Commerce.',
        );
    }
}
