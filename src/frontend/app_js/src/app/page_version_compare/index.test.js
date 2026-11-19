import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

import View from './index.js';

const encoder = new TextEncoder();

// Builds the combined output of `git diff --raw -z --stat --no-abbrev -M`:
// the NUL-terminated --raw section followed by the newline-separated --stat
// section.
function makeCombinedDiffBytes(paths, statText = '') {
  const tokens = [];
  for (const path of paths) {
    tokens.push(`:100644 100644 ${'0'.repeat(40)} ${'1'.repeat(40)} M`);
    tokens.push(path);
  }
  return encoder.encode(`${tokens.join('\0')}\0${statText}`);
}

function makeRepoActions() {
  return {
    executeGitBinaryCommand: vi.fn(() => ({
      promiseDownloadLinkReady: Promise.resolve(),
      download_url: '/command/job-1/stdout/%FILENAME%',
      promise: Promise.resolve(),
    })),
    logError: vi.fn(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('page_version_compare', () => {
  it('refetches the diff when hashLeft/hashRight change', async () => {
    const diffBytes = makeCombinedDiffBytes([
      'docs/project-context.md',
      'src/textconv/processors/markitdown/requirements.txt',
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => diffBytes.slice().buffer,
    })));

    const repoActions = makeRepoActions();
    const repoStatus = { historyData: { history: [], head: null } };

    const wrapper = mount(View, {
      props: { hashLeft: 'aaa', hashRight: 'bbb', repoStatus, repoActions },
      global: {
        stubs: {
          'component-filter-records-form': true,
          'component-format-hash': true,
          'component-format-datetime': true,
          'diff-record': true,
        },
      },
    });
    await flushPromises();

    expect(repoActions.executeGitBinaryCommand).toHaveBeenCalledTimes(1);
    const firstArgs = repoActions.executeGitBinaryCommand.mock.calls[0][0];
    expect(firstArgs).toContain('--stat');
    expect(firstArgs.slice(-2)).toEqual(['aaa', 'bbb']);

    await wrapper.setProps({ hashLeft: 'ccc', hashRight: 'ddd' });
    await flushPromises();

    expect(repoActions.executeGitBinaryCommand).toHaveBeenCalledTimes(2);
    const secondArgs = repoActions.executeGitBinaryCommand.mock.calls[1][0];
    expect(secondArgs).toContain('--stat');
    expect(secondArgs.slice(-2)).toEqual(['ccc', 'ddd']);
  });

  it('renders the --stat block above the records', async () => {
    const diffBytes = makeCombinedDiffBytes(
      [
        'docs/project-context.md',
        'src/textconv/processors/markitdown/requirements.txt',
      ],
      ' docs/project-context.md | 3 ++-\n src/textconv/processors/markitdown/requirements.txt | 1 +\n 2 files changed, 3 insertions(+), 1 deletion(-)\n',
    );
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => diffBytes.slice().buffer,
    })));

    const repoActions = makeRepoActions();
    const repoStatus = { historyData: { history: [], head: null } };

    const wrapper = mount(View, {
      props: { hashLeft: 'aaa', hashRight: 'bbb', repoStatus, repoActions },
      global: {
        stubs: {
          'component-filter-records-form': true,
          'component-format-hash': true,
          'component-format-datetime': true,
          'diff-record': true,
        },
      },
    });
    await flushPromises();

    const statBlock = wrapper.find('.mdm-git-gui-historydiff-stat');
    expect(statBlock.exists()).toBe(true);
    expect(statBlock.text()).toContain('docs/project-context.md');
    expect(statBlock.text()).toContain('2 files changed, 3 insertions(+), 1 deletion(-)');

    const addSpans = statBlock.findAll('.mdm-git-gui-historydiff-stat-add');
    const delSpans = statBlock.findAll('.mdm-git-gui-historydiff-stat-del');
    expect(addSpans.length).toBeGreaterThan(0);
    expect(delSpans.length).toBeGreaterThan(0);
  });
});
