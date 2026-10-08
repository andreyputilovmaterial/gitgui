import { defineComponent, h, onMounted, onUnmounted, } from 'vue';


import Window from './window_component';
import safetyUrlCheck from './safetycheck';


const LinksSiteComponent = {
  props: [
    'repoActions',
  ],
  template: `<span class="gitgui-navlinks-manipulate-component"></span>`, // empty is raising warning
  setup(props) {

    const init = () => {

      const readUrl = linkEl => {
        const urlRaw = linkEl.getAttribute( 'href' );
        const url = new URL( urlRaw, window.location.origin );
        url.searchParams.set( 'embed', '1' );
        // const result = url.pathname + url.search + url.hash;
        // return result;
        return url.toString();
      };

      const createLinkHandler = url => {
        const MyWindowSpecificToThisUrl = defineComponent( {
          setup( _, { attrs } ) {
            try {
              return /* render fn */ () => {
                try {
                  return h( Window, {
                    ...attrs,
                    url,
                  } );
                } catch( e ) {
                  props.repoActions.logError( e );
                  throw e;
                }
              }
            } catch( e ) {
              props.repoActions.logError( e );
              throw e;
            }
          },
        } )
        return function( event ) {
          event.preventDefault();
          ( async function() {
            try {
              await props.repoActions.createModal( MyWindowSpecificToThisUrl );
            } catch(e) {
              if( e instanceof Error ) {
                props.repoActions.logError(`error when calling modal on opened nav link: ${e}`);
                throw e;
              }
            }
          } )();
          return false;
        }
      }

      Array.from( document.querySelectorAll( '[navigation-role] a, a[navigation-role]' ) ).forEach( function( linkEl ) {
        try {

          const url = readUrl( linkEl );
          if( safetyUrlCheck( url ) ) {
            const handler = createLinkHandler( url );
            linkEl.addEventListener( 'click', handler );
            onUnmounted( () => { linkEl.removeEventListener( 'click', handler ); } );
          }

        } catch( e ) {
          try {
            props.repoActions.logError( e );
          } catch( ee ) {
            // ok to ignore
          }
        }
      } );
    };


    onMounted( init );

  },
}
export default LinksSiteComponent;
