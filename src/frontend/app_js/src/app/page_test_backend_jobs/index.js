
import { reactive, ref, onMounted } from 'vue';

import './style.css';

// Test page: exercise every kind of backend "job" the app can start, so any
// typo in the job/pipe plumbing shows up immediately. The job kinds are the
// ones documented in docs/streaming-jobs.md:
//   - sync text command       (subprocess.run)
//   - streamed binary command (subprocess.Popen + stdout reader)
//   - interactive command     (subprocess.Popen with live stdout/stderr)
//   - piped command           (CLI producer + python-fn consumer)
//   - job as a function       (handle_task_from_function.py)
//   - textconv                (direct /textconv endpoint, and as a pipe consumer)
//
// Each example records stdout/stderr/exit code as they arrive. The returned
// jobData objects are already Vue-reactive (see git__execute_commands), so
// stderr/exit code update live; stdout is appended by draining getData().
const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-test-backend-jobs mdm-git-gui-page-test-backend-jobs">
  <p class="description">Run each backend job type and watch stdout, stderr and exit code. Streamed jobs update as output arrives.</p>
  <div class="error">{{ pageError }}</div>

  <div class="mdm-git-gui-test-jobs-examples">
    <section v-for="example in examples" :key="example.id" class="mdm-git-gui-test-jobs-example">
      <h2 class="title">{{ example.title }}</h2>
      <p class="desc">{{ example.description }}</p>

      <form class="mdmreport-controls" @submit.prevent="runExample(example)">
        <div v-if="example.needsSpec" class="mdmreport-controls-group">
          <label :for="'test-jobs-spec-' + example.id">Object spec:</label>
          <input :id="'test-jobs-spec-' + example.id" v-model="catFileSpec" class="mdmreport-control" type="text" placeholder="HEAD:README.md" />
        </div>
        <div v-if="example.needsCatFilename" class="mdmreport-controls-group">
          <label :for="'test-jobs-catfile-' + example.id">Working-tree file:</label>
          <input :id="'test-jobs-catfile-' + example.id" v-model="catFilename" class="mdmreport-control" type="text" placeholder=".clinerules" />
        </div>
        <div v-if="example.needsTextconvFilename" class="mdmreport-controls-group">
          <label :for="'test-jobs-textconvfile-' + example.id">Textconv filename:</label>
          <input :id="'test-jobs-textconvfile-' + example.id" v-model="textconvFilename" class="mdmreport-control" type="text" placeholder="file.txt" />
        </div>
        <div class="mdmreport-controls-group mdm-git-gui-test-jobs-actions">
          <button type="submit" class="mdm-btn mdm-btn-primary" :disabled="!!busy[example.id]">
            <component-loader-spinner v-if="busy[example.id]" />
            Run
          </button>
        </div>
      </form>

      <div v-if="records[example.id]" class="mdm-git-gui-test-jobs-output">
        <div v-if="records[example.id].isStreaming" class="mdm-git-gui-test-jobs-streaming">
          <component-loader-inprogress /> streaming…
        </div>
        <div class="mdm-git-gui-test-jobs-exit">exit code: {{ formatExit(records[example.id]) }}</div>
        <div v-if="records[example.id].resultError" class="error">{{ records[example.id].resultError }}</div>

        <template v-if="!isBinaryRecord(records[example.id])">
          <pre class="stdout">{{ textStdout(records[example.id]) }}</pre>
        </template>
        <template v-else>
          <div class="mdm-git-gui-test-jobs-binary-meta">
            <span>{{ records[example.id].bytes == null ? '…' : records[example.id].bytes }} bytes</span>
            <a v-if="downloadUrl(records[example.id])" :href="downloadUrl(records[example.id])" target="_blank" rel="noopener">download</a>
          </div>
          <pre class="preview">{{ records[example.id].preview }}</pre>
        </template>

        <pre v-if="records[example.id].stderr" class="stderr">{{ records[example.id].stderr }}</pre>
        <pre v-if="records[example.id].producer_stderr" class="stderr producer">producer stderr: {{ records[example.id].producer_stderr }}</pre>
      </div>
    </section>
  </div>
</div>
`,
  setup(props) {
    const records = reactive({});
    const busy = reactive({});
    const pageError = ref('');

    // Shared inputs (one ref per example kind, so examples stay independent).
    const catFileSpec = ref('HEAD:.gitignore');
    const catFilename = ref('.clinerules');
    const textconvFilename = ref('textconv-test.txt');

    function attachRecord(exampleId, record, label) {
      record.label = label;
      record.resultError = '';
      record.isStreaming = true;
      record.bytes = null;
      record.preview = '';
      record.streamedStdout = '';
      records[exampleId] = record;
      return record;
    }

    function attachErrorRecord(exampleId, label, error) {
      const record = reactive({
        label,
        status: 'error',
        stdout: '',
        streamedStdout: '',
        stderr: '',
        exit_code: null,
        resultError: (error && error.message) || String(error),
        isStreaming: false,
        bytes: null,
        preview: '',
        download_url: null,
        is_binary: false,
      });
      records[exampleId] = record;
      return record;
    }

    function previewBytes(chunks) {
      const total = chunks.reduce((n, chunk) => n + chunk.byteLength, 0);
      const head = new Uint8Array(Math.min(total, 1024));
      let offset = 0;
      for (const chunk of chunks) {
        const n = Math.min(chunk.byteLength, head.byteLength - offset);
        head.set(chunk.subarray(0, n), offset);
        offset += n;
        if (offset >= head.byteLength) break;
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(head);
    }

    async function finishStream(record) {
      try {
        await record.promiseDownloadLinkReady;
        if (record.is_binary) {
          record.bytes = 0;
          const chunks = [];
          for await (const chunk of record.getData()) {
            record.bytes += chunk.byteLength;
            chunks.push(chunk);
          }
          record.preview = previewBytes(chunks);
        } else {
          record.streamedStdout = '';
          for await (const chunk of record.getData()) {
            record.streamedStdout += chunk;
          }
        }
        await record.promise;
      } catch (e) {
        record.resultError = (e && e.message) || String(e);
        record.status = 'error';
      } finally {
        record.isStreaming = false;
      }
    }

    async function finishPipe(producer, consumer) {
      try {
        await consumer.promiseDownloadLinkReady;
        consumer.streamedStdout = '';
        const consume = (async () => {
          for await (const chunk of consumer.getData()) {
            consumer.streamedStdout += chunk;
          }
        })();
        await Promise.all([producer.promise, consumer.promise, consume]);
      } catch (e) {
        consumer.resultError = (e && e.message) || String(e);
        consumer.status = 'error';
      } finally {
        consumer.isStreaming = false;
        consumer.producer_stderr = producer.stderr || '';
        consumer.producer_exit_code = producer.exit_code ?? null;
      }
    }

    async function runTextSync() {
      const label = 'git status — text (sync)';
      try {
        const record = await props.repoActions.executeGitCommand(['git', 'status']);
        attachRecord('text-sync', record, label);
        record.isStreaming = false;
      } catch (e) {
        attachErrorRecord('text-sync', label, e);
      }
    }

    async function runBinaryCatFile() {
      const spec = catFileSpec.value.trim() || 'HEAD';
      const label = `git cat-file blob ${spec} — binary (streamed)`;
      try {
        const record = await props.repoActions.executeGitBinaryCommand(['git', 'cat-file', 'blob', spec], {});
        attachRecord('binary-cat-file', record, label);
        await finishStream(record);
      } catch (e) {
        attachErrorRecord('binary-cat-file', label, e);
      }
    }

    async function runInteractiveTest() {
      const label = 'test — interactive (streamed stdout/stderr)';
      try {
        const record = await props.repoActions.executeGitAsyncCommand(['test', 'python', '~/test.py'], {});
        attachRecord('interactive', record, label);
        await finishStream(record);
      } catch (e) {
        attachErrorRecord('interactive', label, e);
      }
    }

    async function runCatFunction() {
      const filename = catFilename.value.trim() || '.clinerules';
      const label = `cat ${filename} — job as a function (handle_task_from_function)`;
      try {
        const record = await props.repoActions.executeGitBinaryCommand(['cat', filename], {});
        attachRecord('function', record, label);
        await finishStream(record);
      } catch (e) {
        attachErrorRecord('function', label, e);
      }
    }

    async function runPipeTar() {
      const label = 'git archive --format=tar HEAD | tar -t — piped command';
      try {
        const producer = await props.repoActions.executeGitBinaryCommand(['git', 'archive', '--format=tar', 'HEAD'], {});
        await producer.promiseDownloadLinkReady;
        const pipeDict = await producer.configureStdoutReaderPipe(['tar', '-t']);
        const consumer = await props.repoActions.attachToRunningCommand(pipeDict.job_id, {
          parentJobId: producer.job_id,
          is_binary: false,
          is_interactive: true,
        });
        attachRecord('pipe-tar', consumer, label);
        await finishPipe(producer, consumer);
      } catch (e) {
        attachErrorRecord('pipe-tar', label, e);
      }
    }

    async function runPipeTextconv() {
      const spec = catFileSpec.value.trim() || 'HEAD';
      const filename = textconvFilename.value.trim() || 'textconv-test.txt';
      const label = `git cat-file blob ${spec} | textconv --filename ${filename}`;
      try {
        const producer = await props.repoActions.executeGitBinaryCommand(['git', 'cat-file', 'blob', spec], {});
        await producer.promiseDownloadLinkReady;
        const pipeDict = await producer.configureStdoutReaderPipe(['textconv', '--filename', filename]);
        const consumer = await props.repoActions.attachToRunningCommand(pipeDict.job_id, {
          parentJobId: producer.job_id,
          is_binary: false,
          is_interactive: true,
        });
        attachRecord('textconv', consumer, label);
        await finishPipe(producer, consumer);
      } catch (e) {
        attachErrorRecord('textconv', label, e);
      }
    }

    async function runTextconvDirect() {
      const spec = catFileSpec.value.trim() || 'HEAD';
      const filename = textconvFilename.value.trim() || 'textconv-test.txt';
      const label = `textconv (direct /textconv endpoint) on ${spec}`;
      const record = reactive({
        label,
        status: 'running',
        stdout: '',
        streamedStdout: '',
        stderr: '',
        exit_code: null,
        resultError: '',
        isStreaming: true,
        bytes: null,
        preview: '',
        download_url: null,
        is_binary: false,
      });
      records['textconv-direct'] = record;
      try {
        const bytes = await props.repoActions.catFileBinary(spec, filename);
        const parsed = await props.repoActions.textconv(bytes, filename);
        record.stdout = parsed.text;
        record.headers = parsed.headers;
        record.exit_code = 0;
      } catch (e) {
        record.resultError = (e && e.message) || String(e);
        record.status = 'error';
      } finally {
        record.isStreaming = false;
      }
    }


    const examples = [
      {
        id: 'text-sync',
        title: 'Text command (sync)',
        description: 'A normal subprocess.run() job. Output arrives only when it finishes.',
        needsSpec: false,
        needsCatFilename: false,
        needsTextconvFilename: false,
        run: runTextSync,
      },
      {
        id: 'binary-cat-file',
        title: 'Binary command (streamed)',
        description: 'A git cat-file blob whose bytes are served through the stdout reader and downloaded.',
        needsSpec: true,
        needsCatFilename: false,
        needsTextconvFilename: false,
        run: runBinaryCatFile,
      },
      {
        id: 'interactive',
        title: 'Interactive command (streamed)',
        description: 'The "test" command prints ~15 lines to stdout and, with half the frequency, to stderr. Watch both arrive.',
        needsSpec: false,
        needsCatFilename: false,
        needsTextconvFilename: false,
        run: runInteractiveTest,
      },
      {
        id: 'pipe-tar',
        title: 'Piped command',
        description: 'git archive (CLI producer) is piped into the tar output postprocessor (a Python function) that lists the archive.',
        needsSpec: false,
        needsCatFilename: false,
        needsTextconvFilename: false,
        run: runPipeTar,
      },
      {
        id: 'function',
        title: 'Job as a function',
        description: 'The "cat" command is not a real CLI command: the backend sanitizer turns it into a Python function run by handle_task_from_function.',
        needsSpec: false,
        needsCatFilename: true,
        needsTextconvFilename: false,
        run: runCatFunction,
      },
      {
        id: 'textconv',
        title: 'Textconv (pipe)',
        description: 'git cat-file blob is piped into the textconv output postprocessor and its converted text is streamed back.',
        needsSpec: true,
        needsCatFilename: false,
        needsTextconvFilename: true,
        run: runPipeTextconv,
      },
      {
        id: 'textconv-direct',
        title: 'Textconv (direct endpoint)',
        description: 'The non-job /textconv HTTP endpoint, fed with the bytes returned by repoActions.catFileBinary.',
        needsSpec: true,
        needsCatFilename: false,
        needsTextconvFilename: true,
        run: runTextconvDirect,
      },
    ];

    async function runExample(example) {
      try {
        busy[example.id] = true;
        await example.run();
      } catch (e) {
        props.repoActions.logError(`Test backend jobs (${example.title}): ${e}`);
        pageError.value = `Failed to run "${example.title}": ${(e && e.message) || e}`;
      } finally {
        busy[example.id] = false;
      }
    }

    function formatExit(record) {
      return typeof record.exit_code === 'number' ? record.exit_code : '…';
    }

    function isBinaryRecord(record) {
      return !!record.is_binary;
    }

    function textStdout(record) {
      // Streamed jobs accumulate into `streamedStdout` (their backend `stdout`
      // field is null and gets re-assigned every poll); sync jobs carry the
      // final text in `stdout`.
      if (record.streamedStdout) return record.streamedStdout;
      return record.stdout == null ? '' : record.stdout;
    }

    function downloadUrl(record) {
      if (typeof record.getDownloadUrl === 'function') {
        try {
          return record.getDownloadUrl('output');
        } catch {
          return '';
        }
      }
      return record.download_url || '';
    }

    // Resolve a real tracked file in HEAD so the object-spec examples start
    // with a value that actually works, instead of a hardcoded guess.
    onMounted(async () => {
      try {
        const list = await props.repoActions.executeGitCommand(['git', 'ls-tree', '-r', '--name-only', 'HEAD']);
        const first = (list.stdout || '').split('\n').map((line) => line.trim()).find(Boolean);
        if (first) {
          catFileSpec.value = `HEAD:${first}`;
          catFilename.value = first;
        }
      } catch {
        // keep the defaults; the examples will just surface an error if they are wrong
      }
    });

    return {
      records,
      busy,
      pageError,
      catFileSpec,
      catFilename,
      textconvFilename,
      examples,
      runExample,
      formatExit,
      isBinaryRecord,
      textStdout,
      downloadUrl,
    };
  },
};

export default View;

