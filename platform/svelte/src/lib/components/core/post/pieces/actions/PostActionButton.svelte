<script lang="ts">
import type { IconType } from "@openpeeps/ui";
import { Button } from "@openpeeps/ui";

interface Props {
	icon: IconType;
	text: string;
	action: () => void;
	active?: boolean;
	disabled?: boolean;
}

const { icon: Icon, text, action, active, disabled = false }: Props = $props();
const textColor = $derived(active ? "text-primary-500" : "");

</script>

<Button title={text} {action} class={`flex items-center gap-1 ${textColor} ${disabled ? 'text-ghost-primary' : ''}`} disabled={disabled} >
	<Icon size={16} />
	<span class="text-sm md:text-base">{text}</span>
</Button>
