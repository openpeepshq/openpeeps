<script lang="ts">
  // import { Button } from '@openpeeps/ui';
  // import { Smile } from 'lucide-svelte';
  import { AudioInput, DocumentInput, ImageInput } from '$lib/components';
  import type { PostDataUnion } from '@openpeeps/common/types';
	import { i18nContext } from '@openpeeps/svelte/components/i18n';

  interface Props {
    postData: PostDataUnion;
  }

  let { postData = $bindable() }: Props = $props();
	const { t } = i18nContext();

</script>

<div class="flex items-center gap-x-2 md:gap-x-3">
  <!-- <Button title="Add Emoji" class=" btn-icon-sm cursor-not-allowed">
		<Smile class="text-surface-400" />
	</Button> -->
  <!-- <AudioInput
		onchange={(attachment) => {
			if (attachment) {
				if (!postData.attachments) {
					postData.attachments = [];
				}
				postData.attachments.push(attachment);
				console.log(postData.attachments);
			}
		}}
		usage="post-audio"
		showAltInput={false}
	/> -->
  <ImageInput
    title={t('posts.form.addImage')}
    displayType="button"
    onchange={(attachment) => {
      if (attachment) {
        if (!postData.attachments) {
          postData.attachments = [];
        }
        postData.attachments.push(attachment);
      }
    }}
    usage="post-image"
    showSelectAspectRatio
    showAltInput
  />
  <DocumentInput
    title={t('posts.form.addDocument')}
    usage="post-document"
    onchange={(attachment) => {
      if (attachment) {
        if (!postData.attachments) {
          postData.attachments = [];
        }
        postData.attachments.push(attachment);
      }
    }}
  />
</div>
