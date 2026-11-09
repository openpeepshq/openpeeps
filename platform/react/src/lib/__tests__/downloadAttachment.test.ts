/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadAttachment } from '../downloadAttachment';

describe('downloadAttachment', () => {
  let clicked: HTMLAnchorElement[];
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clicked = [];
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('clicks an anchor that downloads the URL with the given filename', () => {
    downloadAttachment('/media/abc', 'report.pdf');
    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe(new URL('/media/abc', window.location).href);
    expect(clicked[0].download).toBe('report.pdf');
  });

  it('omits the download attribute when no filename is given', () => {
    downloadAttachment('/media/abc');
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('');
  });

  it('removes the temporary anchor from the document', () => {
    downloadAttachment('/media/abc', 'a.txt');
    expect(document.querySelector('a')).toBeNull();
  });
});
