<div class="filament-pages-page">
    <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
        {{ $this->form }}
    </div>

    <div class="mt-6 flex justify-end gap-3">
        <button type="button" wire:click="resetUnsaved"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900">
            Reset Unsaved Changes
        </button>
        <button type="button" wire:click="save"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
            Save Settings
        </button>
    </div>

    <div class="mt-6 rounded-lg bg-warning-50 p-4 dark:bg-warning-900/20">
        <h4 class="text-sm font-medium text-warning-700 dark:text-warning-400">Important Notes</h4>
        <ul class="mt-2 list-disc list-inside space-y-1 text-sm text-warning-700 dark:text-warning-400">
            <li>Settings marked as disabled are read from .env or config files and cannot be changed from the panel.</li>
            <li>Secret values (App Secret, Client Secret) are encrypted in the database.</li>
            <li>Leave secret fields empty to keep current values.</li>
            <li>Some changes may require clearing application cache to take effect.</li>
            <li>Do not change OAuth settings while active publishing jobs are running.</li>
        </ul>
    </div>
</div>