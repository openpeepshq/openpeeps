<script lang="ts">
	import { Button, type IconType } from '@openpeeps/ui';

	interface Props {
		icon: IconType;
		label: string;
		action: () => void;
	}

	const { icon: Icon, label, action }: Props = $props();
</script>

<Button
	class="text-tertiary-500 flex flex-col items-center justify-center gap-y-2 p-2 md:hidden"
	{action}
>
	<Icon />
	<span> {label} </span>
</Button>
