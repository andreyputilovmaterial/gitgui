
// import { Vue } from "./vue.js";
import { createApp, reactive, onMounted, } from 'vue'


import './app.css';
import './app_form_control_adjustments.css';

// global tools
import deepMerge from './common_defs/deep_merge';

// all from "common_components"
import ComponentSectionRollup from './common_components/rollable_sections/index';
import ComponentTabbedPanes from './common_components/tabbed_panes/tabbed_panes';
import ComponentTabbedPane from './common_components/tabbed_panes/tabbed_pane';
import ComponentFilterRecordsForm from './common_components/filter_records_form/index';
import ComponentFormatDatetime from './common_components/format_datetime/index';
import ComponentFormatFilesize from './common_components/format_filesize/index';
import ComponentFormatHash from './common_components/format_hash/index';
import ComponentFormatLocalFilePath from './common_components/format_local_file_path/index';
import ComponentInputNumericRange from './common_components/input_numeric_range/index';
import ComponentInputDatetimeRange from './common_components/input_datetime_range/index';
import ComponentLoaderSpinner from './common_components/loader_spinner/index';
import ComponentLoaderInProgress from './common_components/loader_inprogress/index';
import './common_components/css_grid/styles.css';

// direct children shown in starting view in app - window panes
import AppOnlineIndicator from './app/background_onlineindicator/index.js';
import ErrorView from './app/apppane_errorview/index';
import ManipulateNavLinksDummyWrapper from './app/background_nav_links_enhancer/manipulate_links';
import ModalsSite from './common_components/modals/component';
import TerminalSessionView from './app/apppane_terminalview/index';
import RepoInitView from './app/window_repoinitview/init_repo';
import PageWelcome from './app/apptab_welcomeview/index';
import PageFiles from './app/apptab_filesview/index';
import PageHistory from './app/apptab_historyview/index';
import PageGitignore from './app/window_repoinitview/section_gitignore';
import PagePackcompression from './app/apptab_packcompression/index';

// functions and methods defined in app setup
import useErrorReporting          from './common_app_features/app__error_reporting/index';
import useIsOnline                from './common_app_features/app__is_online/index';
import useModals                  from './common_app_features/app_modals/index';
import useMaintenanceDebug        from './common_app_features/app_z_maintenance_n_debug/index';
import useTextconv                from './common_app_features/util_textconv/index';
import useDiff                    from './common_app_features/util_diff/index';
import useConfigPollingUpdates    from './common_app_features/config_check_updates/index';
 // underscores only mean it is sorted earlier; and yeah it's kind of internal (but they are all internal here)
import useCheckRepoExistence      from './common_app_features/git___is_inited/index';
import useGitCommands             from './common_app_features/git__execute_commands/index';
import useCatFile                 from './common_app_features/git_cat_file/index';
import useGitignore               from './common_app_features/git_gitignore_read/index';
import useHistory                 from './common_app_features/git_history/index';
import useStatus                  from './common_app_features/git_status/index';




document.addEventListener("DOMContentLoaded", () => {



  const app = createApp({
    template: `
<div class="mdm-git-ui-app">
  <div class="mdm-git-gui-app-section-errorbanner">
    <errorbanner :errors="errors"></errorbanner>
  </div>
  <div class="mdm-git-gui-app-section-mainview section">
    <div v-if="repoStatus?.repoExistsData?.repoExists===undefined">Requesting repo status and fetching data, please wait...</div>
    <div v-else-if="repoStatus?.repoExistsData?.repoExists===false" class="repo-existence-section">
      {{ !!repoStatus?.repoExistsData?.repoExists ? '' : 'Repo is not initialized yet' }}
      <repo-init-form v-if="!repoStatus?.repoExistsData?.repoExists" :repoStatus="repoStatus" :repoActions="repoActions" />
    </div>
    <div v-else-if="repoStatus?.repoExistsData?.repoExists" class="mdm-git-gui-mainview">
      <template v-if="!repoStatus?.repoExistsData?.repoExists">
        Repo is not inited. Nothing to display.
      </template>
      <template v-else>
        <component-tabbed-panes active="home">
          <component-tabbed-pane id="home" title="Overview">
            <page-welcome :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="files" title="Files">
            <page-files :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="history" title="History">
            <page-history :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="gitignore" title="Gitignore (tracked files)">
            <page-gitignore :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="packstatus" title="Disk usage">
            <page-packcompression :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
        </component-tabbed-panes>
      </template>
    </div>
  </div>
  <div class="mdm-git-gui-app-section-terminal section">
    <terminalsession-view
      :commands="commands"
      :repoActions="repoActions"
    />
  </div>
  <modals></modals>
  <nav-links-manipulate-dummy-wrapper :repoActions="repoActions" />
  <online-indicator
    :isOnline="repoStatus?.isOnlineData?.isOnline"
    :repoActions="repoActions"
    :repoStatus="repoStatus"
  />
</div>
`,
    components: {
      'errorbanner': ErrorView,
      'repo-init-form': RepoInitView,
      'repoinit-view': RepoInitView,
      'page-welcome': PageWelcome,
      'page-files': PageFiles,
      'page-history': PageHistory,
      'page-gitignore': PageGitignore,
      'page-packcompression': PagePackcompression,
      'terminalsession-view': TerminalSessionView,
      'modals': ModalsSite,
      'nav-links-manipulate-dummy-wrapper': ManipulateNavLinksDummyWrapper,
      'online-indicator': AppOnlineIndicator,
    },
    setup() {

      const repoStatus = reactive({});
      const repoActions = reactive({
        logError: msg => { Promise.resolve().then(()=>{ throw new Error('logError not inited'); }); Promise.resolve().then(()=>{ throw e; }); },
      });

      const exports = {};

      function registerResults(results) {
        //if( !repoActions.logError ) throw new Error('registerResults: logError is missing, it should be inited first!');
        deepMerge(repoActions,results.repoActions);
        deepMerge(repoStatus,results.repoStatus);
        deepMerge(exports,results);
      };

      // call:
      // registerResults( useFeatureXXX( () => ({ ...exports, repoStatus, repoActions, })) );
      // Feature 1 establishes:
      // repoActions.logError
      // Feature 2 can then do:
      // repoActions.logError(...)
      // Feature 3 can use feature 2's API, etc.
      // That's basically dependency injection through a progressively constructed context.
      // You correctly identified the tradeoff:
      // order matters
      // But that's not automatically bad.

      // enriches with repoActions.logError
      // enriches with exports.errors
      registerResults(
        useErrorReporting( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoStatus.config
      registerResults(
        useConfigPollingUpdates( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // sets polling timer that sets repoStatus.isOnlineData.isOnline
      // enriches with repoStatus.isOnlineData
      registerResults(
        useIsOnline( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoStatus?.repoExistsData?.repoExistsData.repoExists (boolean)
      // enriches with repoStatus?.repoExistsData?.repoExistsData.repoReadyPromise (promise)
      // enriches with repoActions.updateGitRepoExistence
      registerResults(
        useCheckRepoExistence( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // onMounted(repoActions.updateGitRepoExistence);

      // enriches with repoActions.executeGitCommand
      // enriches with repoActions.executeGitAsyncCommand
      // enriches with repoActions.executeGitBinaryCommand
      // enriches with repoActions.attachToRunningCommand
      // enriches with exports.gitCommandConcurrencyManager
      // enriches with exports.commands
      registerResults(
        useGitCommands( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // for beautiful outputs in terminal view - so that the first command that we start with is git status
      onMounted(() => repoActions.executeGitCommand(['git','status']));

      // enriches with repoStatus.gitignoreData.gitignore (text)
      // enriches with repoActions.gitignoreRead
      registerResults(
        useGitignore( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoStatus.historyData.head
      // enriches with repoStatus.historyData.history
      // enriches with repoActions.updateHistory
      registerResults(
        useHistory( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoStatus.statusData.status
      // enriches with repoActions.getStatus
      // enriches with repoActions.checkFileStatus
      // enriches with repoActions.checkFolderStatus
      // enriches with repoActions.getTrackedFiles
      // enriches with repoActions.checkFileTracked
      // enriches with repoActions.checkFolderTracked
      registerResults(
        useStatus( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoActions.createModal
      registerResults(
        useModals( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoActions.textconv
      // enriches with repoActions.textconvBackend // (a copy of the above)
      // enriches with repoActions.textconvParseHeaders
      registerResults(
        useTextconv( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoActions.diff
      registerResults(
        useDiff( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // enriches with repoActions.catFileBinary
      // enriches with repoActions.catFileTextconv
      registerResults(
        useCatFile( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      // this should be last
      registerResults(
        useMaintenanceDebug( () => ({
          ...exports,
          repoStatus,
          repoActions,
        }))
      );

      return ({
        ...exports,
        repoStatus,
        repoActions,
      });

    }
  })
  // FORCE VUE DEVTOOLS TO ACTIVATE
  app.config.performance = true;
  app.component('component-section-rollup', ComponentSectionRollup);
  app.component('component-tabbed-panes', ComponentTabbedPanes);
  app.component('component-tabbed-pane', ComponentTabbedPane);
  app.component('component-filter-records-form', ComponentFilterRecordsForm);
  app.component('component-format-datetime', ComponentFormatDatetime);
  app.component('component-format-filesize', ComponentFormatFilesize);
  app.component('component-format-hash', ComponentFormatHash);
  app.component('component-format-local-file-path', ComponentFormatLocalFilePath);
  app.component('component-input-numericrange',ComponentInputNumericRange);
  app.component('component-input-datetimerange',ComponentInputDatetimeRange);
  app.component('component-loader-spinner', ComponentLoaderSpinner);
  app.component('component-loader-inprogress', ComponentLoaderInProgress);
  app.mount('#gitui_app');





});
