<div class="spinner"></div>

<style>
	.spinner {
		@apply border-surface-400 border-t-surface-50 block h-10 w-10 rounded-full border-4;
		animation: rotation 1s infinite linear;
	}

	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(359deg);
		}
	}
</style>
