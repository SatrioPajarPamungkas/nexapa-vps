<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>Tambah Pengguna - Nexapa Admin</title>

    <style>
        :root {
            color-scheme: dark;
            font-family: Inter, Arial, sans-serif;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #030712;
            color: #f9fafb;
        }

        .container {
            width: min(920px, calc(100% - 32px));
            margin: 40px auto;
        }

        .topbar,
        .actions,
        .summary-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .topbar {
            margin-bottom: 24px;
        }

        .card {
            padding: 24px;
            border: 1px solid #374151;
            border-radius: 16px;
            background: #111827;
        }

        h1 {
            margin: 0 0 6px;
            font-size: 26px;
        }

        p,
        small {
            color: #9ca3af;
        }

        .field {
            margin-bottom: 18px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }

        input,
        select {
            width: 100%;
            padding: 11px 12px;
            color: #f9fafb;
            background: #1f2937;
            border: 1px solid #4b5563;
            border-radius: 9px;
        }

        input:focus,
        select:focus {
            outline: 2px solid #2563eb;
            border-color: transparent;
        }

        .plans {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .plan {
            position: relative;
            padding: 18px;
            border: 1px solid #374151;
            border-radius: 14px;
            cursor: pointer;
            background: #0b1220;
        }

        .plan:has(input:checked) {
            border-color: #6366f1;
            background: #172554;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, .2);
        }

        .plan input {
            position: absolute;
            width: auto;
            top: 15px;
            right: 15px;
        }

        .plan strong,
        .plan span,
        .plan small {
            display: block;
        }

        .plan strong {
            margin-bottom: 8px;
            font-size: 18px;
        }

        .plan span {
            color: #a5b4fc;
            font-size: 14px;
        }

        .plan small {
            margin-top: 8px;
            line-height: 1.5;
        }

        .summary {
            margin: 22px 0;
            padding: 18px;
            border: 1px solid #334155;
            border-radius: 13px;
            background: #0f172a;
        }

        .summary-row + .summary-row {
            margin-top: 10px;
        }

        .summary strong {
            color: #a7f3d0;
        }

        .checkbox {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .checkbox input {
            width: auto;
        }

        .actions {
            justify-content: flex-end;
            margin-top: 24px;
        }

        .button {
            display: inline-block;
            padding: 11px 18px;
            color: #fff;
            background: #2563eb;
            border: 0;
            border-radius: 9px;
            text-decoration: none;
            cursor: pointer;
        }

        .button.secondary {
            background: #374151;
        }

        .alert {
            margin-bottom: 20px;
            padding: 14px;
            border-radius: 9px;
        }

        .alert.success {
            color: #a7f3d0;
            background: #064e3b;
        }

        .alert.error {
            color: #fecaca;
            background: #7f1d1d;
        }

        .password-result {
            margin-top: 8px;
            font-family: monospace;
        }

        @media (max-width: 700px) {
            .plans {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body>
<div class="container">
    <div class="topbar">
        <div>
            <h1>Tambah Pengguna Berlangganan</h1>
            <p>
                Buat akun Publisher + CRM dan aktifkan paketnya.
            </p>
        </div>

        <a class="button secondary" href="/admin/all-users">
            Kembali
        </a>
    </div>

    @if (session('success'))
        <div class="alert success">
            <strong>{{ session('success') }}</strong>

            @if (session('created_password'))
                <div class="password-result">
                    Password: {{ session('created_password') }}
                </div>
            @endif
        </div>
    @endif

    @if ($errors->any())
        <div class="alert error">
            <strong>Akun belum berhasil dibuat.</strong>

            <ul>
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form
        method="POST"
        action="{{ route('admin.user-provisioning.store') }}"
        class="card"
    >
        @csrf

        <div class="field">
            <label for="full_name">Nama lengkap</label>

            <input
                id="full_name"
                name="full_name"
                value="{{ old('full_name') }}"
                maxlength="255"
                required
            >
        </div>

        <div class="field">
            <label for="email">Email</label>

            <input
                id="email"
                type="email"
                name="email"
                value="{{ old('email') }}"
                maxlength="255"
                required
            >
        </div>

        <div class="field">
            <label>Pilih paket</label>

            <div class="plans">
                <label class="plan">
                    <input
                        type="radio"
                        name="plan_code"
                        value="starter"
                        @checked(old('plan_code', 'starter') === 'starter')
                    >

                    <strong>Starter</strong>
                    <span>Rp50.000/bulan</span>
                    <small>
                        1 pengguna · 3 sosial · 1.000 kontak ·
                        50 AI
                    </small>
                </label>

                <label class="plan">
                    <input
                        type="radio"
                        name="plan_code"
                        value="pro"
                        @checked(old('plan_code') === 'pro')
                    >

                    <strong>Pro</strong>
                    <span>Rp75.000/bulan</span>
                    <small>
                        5 pengguna · 10 sosial · 5.000 kontak ·
                        300 AI
                    </small>
                </label>

                <label class="plan">
                    <input
                        type="radio"
                        name="plan_code"
                        value="business"
                        @checked(old('plan_code') === 'business')
                    >

                    <strong>Business</strong>
                    <span>Rp100.000/bulan</span>
                    <small>
                        15 pengguna · 30 sosial · 25.000 kontak ·
                        1.000 AI
                    </small>
                </label>
            </div>
        </div>

        <div class="field">
            <label for="billing_cycle">Periode langganan</label>

            <select
                id="billing_cycle"
                name="billing_cycle"
                required
            >
                <option
                    value="monthly"
                    @selected(old('billing_cycle') === 'monthly')
                >
                    Bulanan
                </option>

                <option
                    value="yearly"
                    @selected(old('billing_cycle') === 'yearly')
                >
                    Tahunan — hemat 2 bulan
                </option>
            </select>
        </div>

        <div class="summary">
            <div class="summary-row">
                <span>Produk</span>
                <strong>Publisher + CRM + AI</strong>
            </div>

            <div class="summary-row">
                <span>Total harga</span>
                <strong id="price-summary">Rp50.000</strong>
            </div>

            <div class="summary-row">
                <span>Masa aktif</span>
                <strong id="duration-summary">1 bulan</strong>
            </div>
        </div>

        <div class="field">
            <label for="crm_workspace_name">
                Nama workspace CRM
            </label>

            <input
                id="crm_workspace_name"
                name="crm_workspace_name"
                value="{{ old('crm_workspace_name') }}"
                maxlength="255"
                required
            >
        </div>

        <input
            type="hidden"
            name="publisher_role"
            value="user"
        >

        <div class="field">
            <label for="temporary_password">Password</label>

            <input
                id="temporary_password"
                type="password"
                name="temporary_password"
                minlength="8"
                maxlength="128"
                autocomplete="new-password"
                required
            >
        </div>

        <div class="field">
            <label for="temporary_password_confirmation">
                Konfirmasi password
            </label>

            <input
                id="temporary_password_confirmation"
                type="password"
                name="temporary_password_confirmation"
                minlength="8"
                maxlength="128"
                autocomplete="new-password"
                required
            >
        </div>

        <div class="field checkbox">
            <input
                id="email_verified"
                type="checkbox"
                name="email_verified"
                value="1"
                @checked(old('email_verified'))
            >

            <label for="email_verified">
                Tandai email sudah diverifikasi
            </label>
        </div>

        <div class="actions">
            <a class="button secondary" href="/admin/all-users">
                Batal
            </a>

            <button class="button" type="submit">
                Buat akun dan aktifkan paket
            </button>
        </div>
    </form>
</div>

<script>
const prices = {
    starter: {
        monthly: 'Rp50.000',
        yearly: 'Rp500.000',
    },
    pro: {
        monthly: 'Rp75.000',
        yearly: 'Rp750.000',
    },
    business: {
        monthly: 'Rp100.000',
        yearly: 'Rp1.000.000',
    },
};

const priceSummary =
    document.getElementById('price-summary');

const durationSummary =
    document.getElementById('duration-summary');

const billingCycle =
    document.getElementById('billing_cycle');

function updateSummary() {
    const selectedPlan = document.querySelector(
        'input[name="plan_code"]:checked'
    )?.value || 'starter';

    const cycle = billingCycle.value;

    priceSummary.textContent =
        prices[selectedPlan][cycle];

    durationSummary.textContent =
        cycle === 'yearly' ? '12 bulan' : '1 bulan';
}

document
    .querySelectorAll('input[name="plan_code"]')
    .forEach((input) => {
        input.addEventListener('change', updateSummary);
    });

billingCycle.addEventListener('change', updateSummary);
updateSummary();
</script>
</body>
</html>
