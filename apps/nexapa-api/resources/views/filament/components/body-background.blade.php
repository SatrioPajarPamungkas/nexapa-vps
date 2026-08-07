<div class="fi-body-background">
    <div class="fi-body-gradient"></div>
    {{ $slot }}
</div>

<style>
.fi-body-background {
    position: relative;
    min-height: 100vh;
}

.fi-body-gradient {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
        radial-gradient(circle at 15% 10%, rgba(37, 99, 235, 0.08), transparent 40%),
        radial-gradient(circle at 85% 80%, rgba(14, 165, 233, 0.06), transparent 35%),
        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.03), transparent 50%);
    pointer-events: none;
    z-index: 0;
}

.dark .fi-body-gradient {
    background: 
        radial-gradient(circle at 15% 10%, rgba(37, 99, 235, 0.12), transparent 40%),
        radial-gradient(circle at 85% 80%, rgba(14, 165, 233, 0.08), transparent 35%),
        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05), transparent 50%);
}
</style>