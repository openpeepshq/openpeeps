import { useWelcomePreview } from '../../../hooks/useWelcomePreview';
import { truncateMarkdown, stripMarkdownImages } from '@openpeepshq/common/lib';
import { TruncatedMarkdown } from '../../post/TruncatedMarkdown';

export const WelcomePreview = () => {
  const { eyebrow, title, description, markdown, imageUrl, imageFit } =
    useWelcomePreview();

  return (
    <div
      data-testid="welcome-preview-card"
      className="flex w-full min-w-0 flex-row items-center gap-4"
    >
      {imageUrl ? (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md">
          <img
            src={imageUrl}
            alt=""
            className={`h-full w-full ${
              imageFit === 'cover' ? 'object-cover' : 'object-contain'
            }`}
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {eyebrow ? (
          <p className="text-muted-foreground truncate text-xs">{eyebrow}</p>
        ) : null}
        <p className="line-clamp-2 font-semibold">{title}</p>
        {markdown ? (
          <TruncatedMarkdown
            source={markdown}
            snippet={truncateMarkdown(stripMarkdownImages(markdown), 2, 240)}
            maxLines={2}
            className="break-words text-sm text-muted-foreground"
          />
        ) : description ? (
          <p className="text-muted-foreground line-clamp-3 break-words text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
};
