<?php

use App\Http\Controllers\AdminUserProvisioningController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('admin/user-provisioning')
    ->name('admin.user-provisioning.')
    ->group(function (): void {
        Route::get(
            '/create',
            [AdminUserProvisioningController::class, 'create']
        )->name('create');

        Route::post(
            '/',
            [AdminUserProvisioningController::class, 'store']
        )->name('store');
    });
